import {settings,state} from "./settings.js"
import {initializeInput} from "./input.js"
import * as glMatrix from "gl-matrix"
let WebGlHelperFunctions = {
    createProgram: function(gl, vertexShaderSource, fragmentShaderSource) {
        var program = gl.createProgram();
        gl.attachShader(program, this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
        gl.attachShader(program, this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        throw new Error("Error linking program.");
    },

    createShader: function(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
        console.log(gl.getShaderInfoLog(shader));
        console.log(this.shaderFormat(source));
        gl.deleteShader(shader);
        throw new Error("Error compiling "+{[gl.VERTEX_SHADER]:"vertex",[gl.FRAGMENT_SHADER]:"fragment"}[type]+" shader.");
    },

    shaderFormat: function(source){
        return(source.split("\n").map((x,i)=>i.toString().padEnd(3)+": "+x).join("\n"))
    }
}


function updateInput(){
    let now = performance.now();
    let deltaTime = now - state.lastInputUpdate;
    deltaTime=1000/60;
    let mousespeed=1/5000;

    state.cameraHorizontalAngle-=mousespeed*state.input.mouseX*deltaTime;
    state.cameraVerticalAngle-=mousespeed*state.input.mouseY*deltaTime;

    state.input.mouseX=0;
    state.input.mouseY=0;

    //clamp vertical
    state.cameraVerticalAngle=Math.max(state.cameraVerticalAngle,-Math.PI/2)
    state.cameraVerticalAngle=Math.min(state.cameraVerticalAngle,Math.PI/2)

    state.lastInputUpdate=now;
}

function generateCameraMatrix(){
    let up=new Float32Array([
        0,
        1,
        0,
    ]);

    let cameraForward = new Float32Array([
        Math.cos(state.cameraVerticalAngle)*Math.sin(state.cameraHorizontalAngle),
        Math.sin(state.cameraVerticalAngle),
        Math.cos(state.cameraVerticalAngle)*Math.cos(state.cameraHorizontalAngle),
    ]);

    let cameraRight=new Float32Array(3);
    glMatrix.vec3.cross(cameraRight,up,cameraForward);

    let cameraUp=new Float32Array(3);
    glMatrix.vec3.cross(cameraUp,cameraForward,cameraRight);

    let cameraTarget=new Float32Array(3);
    glMatrix.vec3.add(cameraTarget,state.cameraPosition,cameraForward);

    let camMat=new Float32Array(16);

    glMatrix.mat4.lookAt(camMat,state.cameraPosition,cameraTarget,cameraUp);
    return(camMat)
}

function startRenderer(canvas,sources){
    state.canvas=canvas;
    for (var sourceName in sources) {
        if (sources.hasOwnProperty(sourceName)) {
            sources[sourceName].preload = 'auto';
            sources[sourceName].autoload = true;
            console.log(sources[sourceName]);
        }
    }
    state.sources=sources;
    initializeInput();
    state.renderInfo=intializeRenderer();
    setTimeout(frame, 1000);
    setInterval(updateTextures,1000/30);
}

function updateTextures(){
    let gl = state.canvas.getContext("webgl");

    let {program,locations,numVertices,textures}=state.renderInfo;


    for (var sourceName in state.sources) {
        if (state.sources.hasOwnProperty(sourceName)) {
            let texture = textures[sourceName];
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, state.sources[sourceName]);
        }
    }
}
function frame(){
    updateInput();
    render(state.renderInfo);
    //window.requestAnimationFrame(frame);
    setTimeout(frame, 1000/60);

}

function intializeRenderer(){
    state.canvas.width = state.width;
    state.canvas.height =  state.height;
    let gl = state.canvas.getContext("webgl");

    let vertexShaderSource = `
    attribute vec3 vertexPosition;
    attribute vec3 imageInformation;//(x,y,image)
    uniform mat4 cameraTransform;

    uniform mat4 projectionTransform;

    varying vec3 pixelImageInformation;
    void main() {
        vec4 cameraVertexPosition=cameraTransform*vec4(vertexPosition,1);

        pixelImageInformation=imageInformation;

        gl_Position=projectionTransform*cameraVertexPosition;

    }
    `;
    let fragmentShaderSource = `
    precision mediump float;

    varying vec3 pixelImageInformation;

    uniform sampler2D forwardSampler;
    uniform sampler2D backwardSampler;
    uniform sampler2D rightSampler;
    uniform sampler2D leftSampler;
    uniform sampler2D upSampler;
    uniform sampler2D downSampler;

    void main() {
        if(pixelImageInformation.z<.5){
            gl_FragColor = texture2D(forwardSampler, vec2(1,1)-pixelImageInformation.yx);

        }else if(pixelImageInformation.z<1.5){
            gl_FragColor = texture2D(backwardSampler, vec2(1,1)-pixelImageInformation.yx);

        }else if(pixelImageInformation.z<2.5){
            gl_FragColor = texture2D(rightSampler, vec2(1,1)-pixelImageInformation.yx);

        }else if(pixelImageInformation.z<3.5){
            gl_FragColor = texture2D(leftSampler, vec2(1,1)-pixelImageInformation.yx);

        }else if(pixelImageInformation.z<4.5){
            gl_FragColor = texture2D(upSampler, pixelImageInformation.xy);

        }else if(pixelImageInformation.z<5.5){
            gl_FragColor = texture2D(downSampler, pixelImageInformation.xy);

        }

    }
    `
    let program=WebGlHelperFunctions.createProgram(gl,vertexShaderSource,fragmentShaderSource);
    gl.useProgram(program);

    let locations={
        vertexPosition: gl.getAttribLocation(program, 'vertexPosition'),
        imageInformation: gl.getAttribLocation(program, 'imageInformation'),
        cameraTransform: gl.getUniformLocation(program, 'cameraTransform'),
        projectionTransform: gl.getUniformLocation(program, 'projectionTransform'),

        forwardSampler:gl.getUniformLocation(program, 'forwardSampler'),
        backwardSampler:gl.getUniformLocation(program, 'backwardSampler'),
        rightSampler:gl.getUniformLocation(program, 'rightSampler'),
        leftSampler:gl.getUniformLocation(program, 'leftSampler'),
        upSampler:gl.getUniformLocation(program, 'upSampler'),
        downSampler:gl.getUniformLocation(program, 'downSampler'),
    }
    let vertexes=[];
    let vertexImageInformation=[];
    function addFace(v1,v2,v3,v4,image){
        vertexes=[
            ...vertexes,
            v1,
            v2,
            v4,
            v3,
            v2,
            v4,
        ]
        vertexImageInformation=[
            ...vertexImageInformation,
            [0,0,image],
            [1,0,image],
            [0,1,image],
            [1,1,image],
            [1,0,image],
            [0,1,image]
        ]
    }
    function addCube(x1,y1,z1,x2,y2,z2){
        /*
        bottom:
        v2 - v3
        |     |
        v1 - v4
        top:
        v6 - v7
        |     |
        v5 - v8
        */
        let v1=[x1,y1,z1];
        let v2=[x1,y2,z1];
        let v3=[x2,y2,z1];
        let v4=[x2,y1,z1];

        let v5=[x1,y1,z2];
        let v6=[x1,y2,z2];
        let v7=[x2,y2,z2];
        let v8=[x2,y1,z2];
        addFace(v1,v2,v3,v4,0);//bottom (forward)
        addFace(v1,v2,v6,v5,3);//left (left)
        addFace(v2,v3,v7,v6,4);//up  (up)
        addFace(v3,v4,v8,v7,2);//right (right)
        addFace(v4,v1,v5,v8,5);//down (down)
        addFace(v5,v6,v7,v8,1);//top (backward)
    }
    addCube(-1,-1,-1,1,1,1);

    let vertexes_processed=new Float32Array(vertexes.flat())
    let vertexImageInformation_processed=new Float32Array(vertexImageInformation.flat())



    { // vertexPosition
        let vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexes_processed, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(
            locations.vertexPosition);
        gl.vertexAttribPointer(
            locations.vertexPosition,
            3,
            gl.FLOAT,
            false,
            0,
            0);
    }
    { // imageInformation
        let imageInformationBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, imageInformationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexImageInformation_processed, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(
            locations.imageInformation);
        gl.vertexAttribPointer(
            locations.imageInformation,
            3,
            gl.FLOAT,
            false,
            0,
            0);
    }

    { // projectionTransform
        let projectionMat=glMatrix.mat4.create();

        glMatrix.mat4.perspective(projectionMat,
            Math.PI/2, //fov
            state.height/state.width, //aspect ratio
            .1, //depth near
            100);//depth far

        gl.uniformMatrix4fv(
            locations.projectionTransform,
            false,
            projectionMat);
    }
    let textures={}
    for (var sourceName in state.sources) {
        if (state.sources.hasOwnProperty(sourceName)) {
            let texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,settings.render.videoWidth,settings.render.videoHeight,0, gl.RGBA, gl.UNSIGNED_BYTE,  new Uint8Array(new Array(settings.render.videoWidth*settings.render.videoHeight*4).fill(55)));
            textures[sourceName]=texture;
        }
    }
    let i=0;
    for (var sourceName in textures) {
        if (textures.hasOwnProperty(sourceName)) {
            gl.uniform1i(locations[sourceName+"Sampler"], i);
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, textures[sourceName]);
            i++;
        }
    }

    {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
    }
    return({program:program,locations:locations,numVertices:vertexes.length,textures:textures});
}

function render(info){
    let {program,locations,numVertices,textures}=info;
    let gl = state.canvas.getContext("webgl");
    gl.useProgram(program);

    { // cameraTransform
        let cameraMat = generateCameraMatrix();

        let cameraMatRotation = new Float32Array(9);

        glMatrix.mat3.set(cameraMatRotation,
            cameraMat[0], cameraMat[1],  cameraMat[2],
            cameraMat[4], cameraMat[5],  cameraMat[6],
            cameraMat[8], cameraMat[9], cameraMat[10],
        )


        gl.uniformMatrix4fv(
            locations.cameraTransform,
            false,
            cameraMat);

    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

export {startRenderer};
