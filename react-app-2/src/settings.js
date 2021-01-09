let settings={
    servers:{
        prod:{
            iceServers:[{
                "urls":["turn:priv.larrys.tech:3478"],
                "username":"test",
                "credential":"test"
            }],
            websocketURL:"wss://priv.larrys.tech:8080"
        },
        dev:{
            iceServers:[{
                urls: "stun:stun.l.google.com:19302"
            }],
            websocketURL:"ws://localhost:8080"
        },
        useDev:true
    },
    debugWebRTC:false,
    render:{
        fov:70,
        near:.1,
        far:100
    },
}

export default settings;
