import './App.css';

import React from 'react';
import adapter from 'webrtc-adapter';
import {settings} from "./settings.js"
import {startRenderer} from "./webgl.js";

class App extends React.Component {
    constructor(props) {
        super(props);
        // create a ref to store the textInput DOM element
        this.renderCanvas = React.createRef();

        this.forwardCam = React.createRef();
        this.backwardCam = React.createRef();
        this.rightCam = React.createRef();
        this.leftCam = React.createRef();
        this.upCam = React.createRef();
        this.downCam = React.createRef();
        this.clientId = -1;
        this.serverId = -1;
    }
    closeConnection() {
        this.numberVideosLoaded=0;
        if (this.connection != null) {
            this.connection.close();
            this.connection = null;
        }
    }
    connect() {
        let servers = settings.servers.useDev ? settings.servers.dev : settings.servers.prod;
        this.socket = new WebSocket(servers.websocketURL);
        this.socket.onopen = (event) => {
            this.socket.send(JSON.stringify({
                type: "openClient"
            }));
        };
        this.numberVideosLoaded=0;
        let iceCandidatesToProcess = []

        let createPeerConnection = () => {
            this.closeConnection();
            iceCandidatesToProcess = [];
            this.connection = new RTCPeerConnection({
                iceServers: servers.iceServers,
                sdpSemantics: "unified-plan"
            });

            this.connection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.send(JSON.stringify({
                        type: "clientIceCandidate",
                        candidate: JSON.stringify(event.candidate)
                    }));
                    if (settings.debugWebRTC) console.log("sent ice candidate");
                }
            };
            this.connection.oniceconnectionstatechange = (event) => {
                if (settings.debugWebRTC) console.log("connection state " + this.connection.iceConnectionState);

                switch (this.connection.iceConnectionState) {
                    case "closed":
                    case "failed":
                        console.log("Connection closed");
                        break;
                }
            };
            this.connection.ontrack = (event) => {
                for (var i = 0; i < event.streams.length; i++) {
                    let stream = event.streams[i];
                    this[event.track.label + "Cam"].current.srcObject = stream;
                }
                this.numberVideosLoaded++;
                if(this.numberVideosLoaded==6)startRenderer(this.renderCanvas.current,{
                    forward:this.forwardCam.current,
                    backward:this.backwardCam.current,
                    right:this.rightCam.current,
                    left:this.leftCam.current,
                    up:this.upCam.current,
                    down:this.downCam.current
                });

                if (settings.debugWebRTC) console.log("Track event ", event.streams);
            };
            this.connection.onremovetrack = (event) => {
                this.numberVideosLoaded--;

                if (settings.debugWebRTC) console.log("Track removal event " + event);
            };
        }

        this.socket.onmessage = (event) => {
            let data = JSON.parse(event.data);
            if (data.type == "openClientInfo") {
                this.clientId = data.id;
                if (settings.debugWebRTC) console.log(this.clientId);
            } else if (data.type == "openClientAssigned") {
                this.serverId = data.assignedServer;
                createPeerConnection();
            } else if (data.type == "serverOfferSDP") {

                if (settings.debugWebRTC) console.log("recieved sdp");

                this.connection.setRemoteDescription({
                        type: "offer",
                        sdp: data.sdp
                    })
                    .then(() => {
                        if (settings.debugWebRTC) console.log("processing " + iceCandidatesToProcess.length + " queued ice canidates");

                        for (var i = 0; i < iceCandidatesToProcess.length; i++) {
                            this.connection.addIceCandidate(iceCandidatesToProcess[i]);
                        }
                        iceCandidatesToProcess = [];
                    })
                    .then(() => {
                        return this.connection.createAnswer();
                    })
                    .then((answer) => {
                        return this.connection.setLocalDescription(answer);
                    })
                    .then(() => {
                        this.socket.send(JSON.stringify({
                            type: "clientAnswerSDP",
                            sdp: this.connection.localDescription.sdp
                        }));
                        if (settings.debugWebRTC) console.log("sent reply sdp ");
                    });
            } else if (data.type == "serverIceCandidate") {
                var candidate = new RTCIceCandidate(JSON.parse(data.candidate));

                if (this.connection && this.connection.remoteDescription && this.connection.remoteDescription.type) {
                    this.connection.addIceCandidate(candidate);
                    if (settings.debugWebRTC) console.log("processed recieved ice candidate");
                } else {
                    iceCandidatesToProcess.push(candidate);

                }

            }
        }

    }

    componentDidMount() {
        this.connect();
    }

    render() {
        return (
            <div className="App">
                <canvas ref={this.renderCanvas}></canvas>
                <div className="webgl-target">
                    <video ref={this.forwardCam} width={settings.render.videoWidth} height={settings.render.videoHeight} autoPlay ></video>
                    <video ref={this.backwardCam} width={settings.render.videoWidth} height={settings.render.videoHeight} autoPlay ></video>
                    <video ref={this.rightCam} width={settings.render.videoWidth} height={settings.render.videoHeight} autoPlay ></video>
                    <video ref={this.leftCam} width={settings.render.videoWidth} height={settings.render.videoHeight} autoPlay ></video>
                    <video ref={this.upCam} width={settings.render.videoWidth} height={settings.render.videoHeight} autoPlay ></video>
                    <video ref={this.downCam} width={settings.render.videoWidth} height={settings.render.videoHeight} autoPlay ></video>
                </div>
            </div>
        )
    }
}

export default App;
