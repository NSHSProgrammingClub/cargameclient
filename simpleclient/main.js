let DEBUG_WEBRTC=false;
let USE_PROD_SERVERS=false;
if(USE_PROD_SERVERS){
    var iceServers=[{
        "urls":["turn:priv.larrys.tech:3478"],
        "username":"test",
        "credential":"test"
    }]
    var websocketURL="wss://priv.larrys.tech:8080";
}else{
    var iceServers=[{
        urls: "stun:stun.l.google.com:19302"
    }]
    var websocketURL="ws://localhost:8080";
}
var tracks=[];
window.onload = () => {
    var socket = new WebSocket(websocketURL);
    socket.onopen = (event) => {
        socket.send(JSON.stringify({
            type: "openClient"
        }));
    };
    let clientId = -1;
    let serverId = -1;
    let connection=null;

    let iceCandidatesToProcess=[]

    function createPeerConnection() {
        closeConnection();
        iceCandidatesToProcess=[];
        connection = new RTCPeerConnection({
            iceServers:iceServers,
            sdpSemantics: "unified-plan"
        });

        connection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: "clientIceCandidate",
                    candidate: JSON.stringify(event.candidate)
                }));
                if(DEBUG_WEBRTC)console.log("sent ice candidate ");
            }
        };
        connection.oniceconnectionstatechange = (event) => {
            if(DEBUG_WEBRTC)console.log("connection state "+ connection.iceConnectionState);
            switch (connection.iceConnectionState) {
                case "closed":
                case "failed":
                    console.log("Connection closed");
                    break;
            }
        };
        connection.ontrack = (event)=>{
            for (var i = 0; i < event.streams.length; i++) {
                let stream=event.streams[i];
                tracks.push(event.track);
                document.getElementById(event.track.label+"-cam").srcObject =stream;
            }
            if(DEBUG_WEBRTC)console.log("Track event ",event.streams);
        };
        connection.onremovetrack = (event)=>{
            if(DEBUG_WEBRTC)console.log("Track removal event "+event);
        };
    }
    function closeConnection(){
        if(connection!=null){
            connection.close();

            connection=null;
        }
    }



    socket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.type == "openClientInfo") {
            clientId = data.id;
            if(DEBUG_WEBRTC)console.log(clientId);
        } else if (data.type == "openClientAssigned") {
            serverId = data.assignedServer;
            createPeerConnection();
        } else if (data.type == "serverOfferSDP") {

            if(DEBUG_WEBRTC)console.log("recieved sdp");

            connection.setRemoteDescription({type:"offer",sdp:data.sdp})
                .then(() => {
                    if(DEBUG_WEBRTC)console.log("processing "+iceCandidatesToProcess.length+" queued ice canidates");

                    for (var i = 0; i < iceCandidatesToProcess.length; i++) {
                        connection.addIceCandidate(iceCandidatesToProcess[i]);
                    }
                    iceCandidatesToProcess=[];
                })
                .then(() => {
                    return connection.createAnswer();
                })
                .then((answer) => {
                    return connection.setLocalDescription(answer);
                })
                .then(() => {
                    socket.send(JSON.stringify({
                        type: "clientAnswerSDP",
                        sdp: connection.localDescription.sdp
                    }));
                    if(DEBUG_WEBRTC)console.log("sent reply sdp ");
                });
        } else if (data.type == "serverIceCandidate") {
            var candidate = new RTCIceCandidate(JSON.parse(data.candidate));

            if(connection&& connection.remoteDescription && connection.remoteDescription.type){
                connection.addIceCandidate(candidate);
                if(DEBUG_WEBRTC)console.log("processed recieved ice candidate");
            }else{
                iceCandidatesToProcess.push(candidate);

            }

        }
    }
}
