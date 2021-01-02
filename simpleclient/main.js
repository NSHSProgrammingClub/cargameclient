window.onload = () => {
    var socket = new WebSocket("ws://localhost:8080");
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
            iceServers: [{
                urls: "stun:stun.l.google.com:19302"
            }]
        });

        connection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: "clientIceCandidate",
                    candidate: JSON.stringify(event.candidate)
                }));
                console.log("sent ice candidate ");
            }
        };
        connection.oniceconnectionstatechange = (event) => {
            console.log("connection state "+ connection.iceConnectionState);
            switch (connection.iceConnectionState) {
                case "closed":
                case "failed":
                    console.log("Connection closed");
                    break;
            }
        };
        connection.ontrack = (event)=>{

            document.getElementById("received_video").srcObject = event.streams[0];
            document.getElementById("received_video").play();
            console.log("Track event ",event.streams);
        };
        connection.onremovetrack = (event)=>{
            console.log("Track removal event "+event);
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
            console.log(clientId);
        } else if (data.type == "openClientAssigned") {
            serverId = data.assignedServer;
            createPeerConnection();
        } else if (data.type == "serverOfferSDP") {

            console.log("recieved sdp");

            connection.setRemoteDescription({type:"offer",sdp:data.sdp})
                .then(() => {
                    console.log("processing "+iceCandidatesToProcess.length+" queued ice canidates");

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
                    console.log("sent reply sdp ");
                });
        } else if (data.type == "serverIceCandidate") {
            var candidate = new RTCIceCandidate(JSON.parse(data.candidate));

            if(connection&& connection.remoteDescription && connection.remoteDescription.type){
                connection.addIceCandidate(candidate);
                console.log("processed recieved ice candidate");
            }else{
                iceCandidatesToProcess.push(candidate);

            }

        }
    }
}
