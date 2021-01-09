import './App.css';

import React from 'react';
import * as THREE from 'three';
import {
    OrbitControls
} from 'three/examples/jsm/controls/OrbitControls'
import adapter from 'webrtc-adapter';
import settings from "./settings.js"


class App extends React.Component {
    constructor(props) {
        super(props);
        // create a ref to store the textInput DOM element
        this.forwardCam = React.createRef();
        this.backwardCam = React.createRef();
        this.rightCam = React.createRef();
        this.leftCam = React.createRef();
        this.upCam = React.createRef();
        this.downCam = React.createRef();
        this.clientId = -1;
        this.serverId = -1;

        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.numberVideosLoaded=0;
    }
    closeConnection() {
        this.numberVideosLoaded=0;
        if (this.connection != null) {
            this.connection.close();
            this.connection = null;
        }
    }
    connect() {
        console.log(settings);
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
                if(this.numberVideosLoaded==6)this.initRenderer();

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
    initRenderer() {
        let camera = new THREE.PerspectiveCamera(settings.render.fov, 2, settings.render.near, settings.render.far);
        camera.position.z = 0;
        this.mount.appendChild(this.renderer.domElement);

        let controls = new OrbitControls(camera, this.renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.update()


        let resizeRendererToDisplaySize = (renderer) => {
            const canvas = this.renderer.domElement;
            const width = window.innerWidth;
            const height = window.innerHeight;
            const needResize = canvas.width !== width || canvas.height !== height;
            if (needResize) {
                this.renderer.setSize(width, height, false);
            }
            return needResize;
        }

        let render = (time) => {

            if (resizeRendererToDisplaySize(this.renderer)) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
            }
            let materialArray = [];
            let texture_ft = new THREE.TextureLoader().load( 'logo192.png');
            let texture_bk = new THREE.TextureLoader().load( 'logo192.png');
            let texture_up = new THREE.TextureLoader().load( 'logo192.png');
            let texture_dn = new THREE.TextureLoader().load( 'logo192.png');
            let texture_rt = new THREE.TextureLoader().load( 'logo192.png');
            let texture_lf = new THREE.TextureLoader().load( 'logo192.png');

            materialArray.push(new THREE.MeshBasicMaterial( { map: texture_ft }));
            materialArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));
            materialArray.push(new THREE.MeshBasicMaterial( { map: texture_up }));
            materialArray.push(new THREE.MeshBasicMaterial( { map: texture_dn }));
            materialArray.push(new THREE.MeshBasicMaterial( { map: texture_rt }));
            materialArray.push(new THREE.MeshBasicMaterial( { map: texture_lf }));

            for (let i = 0; i < 6; i++)
              materialArray[i].side = THREE.BackSide;

            let skyboxGeo = new THREE.BoxGeometry( 10000, 10000, 10000);
            let skybox = new THREE.Mesh( skyboxGeo, materialArray );
            this.scene.add( skybox );
            /*
            let textures=[this.forwardCam.current,this.backwardCam.current,this.rightCam.current,this.leftCam.current,this.upCam.current,this.downCam.current].map(
                e=>new THREE.TextureLoader().load( "logo512.png" )//;new THREE.VideoTexture(e)
            );
            let cube= new THREE.CubeTextureLoader()
        	.setPath( 'textures' )
        	.load( [
        		'logo512.png',
        		'logo512.png',
        		'logo512.png',
        		'logo512.png',
        		'logo512.png',
        		'logo512.png'
        	] );
            console.log(cube);
            //cube.format = cube.images[0].format;
            //cube.generateMipmaps = false;
            //cube.minFilter = THREE.LinearFilter;
            //cube.needsUpdate = true;
            this.scene.background=cube;
            //console.log(textures);
            */
            this.renderer.render(this.scene, camera);

            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }
    componentDidMount() {
        this.initRenderer()
    }

    render() {
        return (
            <div className="App">
                <div className="render-div" ref={ref => (this.mount = ref)} />
                <div className="webgl-target">
                    <video ref={this.forwardCam} autoPlay muted></video>
                    <video ref={this.backwardCam} autoPlay muted></video>
                    <video ref={this.rightCam} autoPlay muted></video>
                    <video ref={this.leftCam} autoPlay muted></video>
                    <video ref={this.upCam} autoPlay muted></video>
                    <video ref={this.downCam} autoPlay muted></video>
                </div>
            </div>
        )
    }
}

export default App;
