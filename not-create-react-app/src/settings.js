let settings={
    servers:{
        prod:{
            iceServers:[{
                "urls":["turn:146.115.140.62:3478"],
                "username":"test",
                "credential":"test"
            },
            {
                "urls":["stun:146.115.140.62:3478"],
                "username":"test",
                "credential":"test"
            },
            {
                urls: "stun:stun.l.google.com:19302"
            }],
            websocketURL:"wss://priv.larrys.tech:8080"
        },
        dev:{
            iceServers:[{
                urls: "stun:stun.l.google.com:19302"
            }],
            websocketURL:"ws://localhost:8080"
        },
        useDev:false
    },
    debugWebRTC:true,
    render:{
        fov:70,
        near:.1,
        far:100,
        videoWidth:720,
        videoHeight:720,
    },

}

let state={
    width:500,
    height:500,
    canvas:null,
    sources:{},
    input:null,


    cameraHorizontalAngle: 0,
    cameraVerticalAngle: 0,
    lastInputUpdate: 0,
    cameraPosition: new Float32Array(3),

    renderInfo:null,
}

export {settings,state};
