import './App.css';

import React from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
var scene = new THREE.Scene();
// var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();

class App extends React.Component {

    connect() {
        const ws = new WebSocket("ws://127.0.0.1:29103");

        ws.addEventListener("message", e => {

            e.data.arrayBuffer().then(data => {
                const arrayData = new Uint8Array(data)

                let images = []
                let startImageIndex = 0;
                let imageIndex = 0;

                for (let index = 0; index < arrayData.length; index++) {

                    if (arrayData[index] === 0x10 && arrayData[index + 1] === 0x50 && arrayData[index + 2] === 0x10) {

                        const imageData = arrayData.slice(startImageIndex, index)

                        const reader = new FileReader()
                        const currentIndex = imageIndex

                        reader.readAsDataURL(new Blob([imageData], {type: "image/png"}))
                        reader.onloadend = function() {
                            images[currentIndex] = reader.result
                            if (currentIndex == 5) {
                                const loader = new THREE.CubeTextureLoader()
                                scene.background = loader.load(images)
                            }

                        }

                        startImageIndex = index + 3;
                        imageIndex++;
                    }
                }
            })

        })
    }

    componentDidMount() {
        this.connect()
        // === THREE.JS CODE START ===

        const fov = 75;
        const aspect = 2;  // the canvas default
        const near = 0.1;
        const far = 100;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        // camera.position.z = 3;
        this.mount.appendChild( renderer.domElement );
        camera.position.z = 3;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.update()


        function resizeRendererToDisplaySize(renderer) {
          const canvas = renderer.domElement;
          const width = window.innerWidth;
          const height = window.innerHeight;
          const needResize = canvas.width !== width || canvas.height !== height;
          if (needResize) {
            renderer.setSize(width, height, false);
          }
          return needResize;
        }

        function render(time) {
          if (resizeRendererToDisplaySize(renderer)) {
            camera.aspect = window.innerWidth/window.innerHeight;
            camera.updateProjectionMatrix();
          }

          renderer.render(scene, camera);

          window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    render() {
        return (
            <div className="App">
                <div ref={ref => (this.mount = ref)} />
            </div>
        )
    }
}

export default App;
