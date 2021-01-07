using WebSocketSharp;
using WebSocketSharp.Server;
using UnityEngine;

public class MessageHandler: WebSocketBehavior {

}


public class Net: MonoBehaviour {
    const string SEPERATOR = ":";

    [SerializeField]
    int port = 29103;

    WebSocketServer server;
    SixCamCapture capture;

    private void Start() {
        server = new WebSocketServer(port);
        server.AddWebSocketService<MessageHandler>("/");
        server.Start();

        capture = GetComponent<SixCamCapture>();
    }

    private void LateUpdate() {
        WebSocketServiceHost service = server.WebSocketServices["/"];
        if (service.Sessions.Count == 0) {return;}

        byte[] resultData = new byte[160000];
        int currentIndex = 0;

        foreach (var screenShot in capture.CaptureAll()) {

            byte[] jpeg = screenShot.EncodeToJPG(92);

            foreach (var b in jpeg)
            {
                resultData[currentIndex] = b;
                currentIndex += 1;
            }
            
            resultData[currentIndex] = 0x10;
            resultData[currentIndex + 1] = 0x50;
            resultData[currentIndex + 2] = 0x10;

            currentIndex += 3;

            Destroy(screenShot);
        }

        service.Sessions.Broadcast(resultData.SubArray(0, currentIndex));
    }
}