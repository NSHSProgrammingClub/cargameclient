using System.Collections;
using System.Collections.Generic;

using UnityEngine;

public class SixCamCapture : MonoBehaviour
{
    [SerializeField]
    Camera topCamera;

    [SerializeField]
    Camera bottomCamera;

    [SerializeField]
    Camera leftCamera;

    [SerializeField]
    Camera rightCamera;

    [SerializeField]
    Camera forwardCamera;

    [SerializeField]
    Camera backwardCamera;

    [SerializeField]
    int outputWidth = 1920;

    [SerializeField]
    int outputHeight = 1080;

    private Camera[] cameras;
    // Start is called before the first frame update
    void Start()
    {
        cameras = new Camera[] {
            forwardCamera,
            backwardCamera,
            topCamera,
            bottomCamera,
            
            
            leftCamera,
            rightCamera,

        };
    }

    public Texture2D[] CaptureAll() {
        Texture2D[] result = new Texture2D[cameras.Length];

        for (int i = 0; i < cameras.Length; i++)
        {
            RenderTexture rt = new RenderTexture(outputWidth, outputHeight, 24);
            cameras[i].targetTexture = rt;

            Texture2D screenShot = new Texture2D(outputWidth, outputHeight, TextureFormat.RGB24, false);
            cameras[i].Render();

            RenderTexture.active = rt;

            screenShot.ReadPixels(new Rect(0, 0, outputWidth, outputHeight), 0, 0);

            cameras[i].targetTexture = null;
            RenderTexture.active = null;
            

            Destroy(rt);

            result[i] = screenShot;
        }
        
        return result;
    }
}
