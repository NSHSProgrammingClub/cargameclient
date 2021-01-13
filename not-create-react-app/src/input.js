import {settings,state} from "./settings.js"

function initializeInput(){
    state.input={
        mouseX:0,
        mouseY:0,
        forward:false,
        backward:false,
        left:false,
        right:false,
        up:false,
        down:false,
    }


    function mouseLockChanged() {
        if (document.pointerLockElement == state.canvas) {
            document.addEventListener("mousemove", mouseMoved, false);
        }else{
            document.removeEventListener("mousemove", mouseMoved, false);
        }
    }
    document.addEventListener('pointerlockchange', mouseLockChanged, false);

    function mouseMoved(e){
        state.input.mouseX += e.movementX;
        state.input.mouseY += e.movementY;
    }

    state.canvas.addEventListener("click", (e) => {
        state.canvas.requestPointerLock();
    });

    let keymap={
        87:"forward",
        38:"forward",
        83:"backward",
        40:"backward",
        65:"left",
        37:"left",
        68:"right",
        39:"right",
        32:"up",
        16:"down",
    }
    let keydown={}

    function updateInput(){
        for (var keycode in keymap) {
            if (keymap.hasOwnProperty(keycode)) {
                state.input[keymap[keycode]]=false;
            }
        }
        for (var keycode in keymap) {
            if (keymap.hasOwnProperty(keycode)) {
                if(keydown[keycode]){
                    state.input[keymap[keycode]]=true;
                }
            }
        }
    }
    state.canvas.addEventListener("keydown", (e) => {
        if (e.keyCode in keymap){
            keydown[e.keyCode]=true;
            updateInput();
        }
    });
    state.canvas.addEventListener("keyup", (e) => {
        if (e.keyCode in keymap){
            keydown[e.keyCode]=false;
            updateInput();
        }
    });
}
export {initializeInput};
