import { Engine, Scene, Vector3, HemisphericLight, SceneLoader, ArcRotateCamera, TransformNode, FxaaPostProcess, LensRenderingPipeline, MeshBuilder, StandardMaterial, Color3} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

// DON'T FORGET TERSER

//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Did I get your attention? This is how I mark TODO tasks

let shotNumber: number = 1;
let guiActiveButton: HTMLButtonElement;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)); // https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
const zoomLevel: number = 12;
const lerpAmount: number = 0.2;
const camView1: Vector3 = new Vector3(zoomLevel*7.5, zoomLevel*5, zoomLevel*7.5);
const camView2: Vector3 = new Vector3(0, 0, zoomLevel*10);
const camView3: Vector3 = new Vector3(zoomLevel*10, 0, 0);
const camTargetA: Vector3 = new Vector3(0, 0.25, 0);
const camTargetB: Vector3 = new Vector3(0, 0.5, 0);

// ^^ Babylon.js
// ||
// vv Vanilla JS

let guiSoundClick: HTMLAudioElement;
let launchButton: HTMLButtonElement;

//////////////////////////////////////
// ABOVE: Imports and Globals
//////////////////////////////////////
// BELOW: Setup
//////////////////////////////////////

const App = async function() { // ONLY MULTI-SCENE APPS NEED TO BE A CLASS, NOT SINGLE ONES

    // Create a canvas element and enable the engine (along with AdaptToDeviceRatio despite performance hit)
    const _canvas: HTMLCanvasElement = document.createElement("canvas");
    document.body.appendChild(_canvas);
    const _engine: Engine  = new Engine(_canvas, true, null, true);
    Engine.audioEngine.useCustomUnlockedButton = true; // CUSTOM: disable automatic mute icon

    // Initialize base scene and faux-orthographic camera pointed at scene origin
    const scene01: Scene = new Scene(_engine);
    const camera01: ArcRotateCamera = new ArcRotateCamera("Camera01", 0, 0, 10, Vector3.Zero(), scene01);
    camera01.fov = 0.02;

    // Change the sky to black
    const skyBox = MeshBuilder.CreateBox("sky", {size:1000.0}, scene01);
    const skyMaterial = new StandardMaterial("sky", scene01);
    skyMaterial.backFaceCulling = false;
	skyMaterial.diffuseColor = new Color3(0.192, 0.192, 0.192); // #313131
	skyBox.material = skyMaterial;
    
    // DEBUG TOOLS
    //camera01.attachControl(true);
    //camera01.useAutoRotationBehavior = true;

    // Makeshift global illumination
    const globalLightA: HemisphericLight = new HemisphericLight("GlobalLightA", new Vector3(0, 2, 2), scene01);
    const globalLightB: HemisphericLight = new HemisphericLight("GlobalLightB", new Vector3(0, -2, -2), scene01);

    // Initialize our filthy editable CSS overlay for GUI
    const gui: HTMLDivElement = document.createElement("div");
    gui.id = "gui";
    document.body.appendChild(gui);

    // Load in our audio
    guiSoundClick = new Audio('./files/click.mp3');

    //////////////////////////////////////
    // ABOVE: Setup
    //////////////////////////////////////
    // BELOW: Main Scene
    //////////////////////////////////////

    // Import model from .glb and attach a TransformNode to _root_ (MULTI-MATERIAL MESHES BECOME SEPARATE IN .glb!)
    const guyMesh = await SceneLoader.ImportMeshAsync("", "./files/", "cube.glb", scene01);
    const guy: TransformNode = new TransformNode("guy");
    guyMesh.meshes[0].parent = guy;

    // Rotate our guy towards the camera
    guy.rotation.y = 0;

    // Instantiate buttons with click CONTROLS and added to body
    const guiB1: guiButton = new guiButton(1, gui);
    const guiB2: guiButton = new guiButton(2, gui);
    const guiB3: guiButton = new guiButton(3, gui); 

    // Highlight the first button
    guiB1.HTML.classList.add("gui__button--chosen");
    guiActiveButton = guiB1.HTML;
    
    // CONTROLS: Keyboard
    window.addEventListener("keydown", (ev) => {
        if (ev.code === 'Digit1') { changeView(guiB1.num, guiB1.HTML); }
        else if (ev.code === 'Digit2') { changeView(guiB2.num, guiB2.HTML); }
        else if (ev.code === 'Digit3') { changeView(guiB3.num, guiB3.HTML); }
    });
    
    // Post-processing: FXAA & depth of field (no bloom or SSR, sorry)
    const postFXAA: FxaaPostProcess = new FxaaPostProcess("fxaa", 1.0, camera01);
    const postLens: LensRenderingPipeline = new LensRenderingPipeline('lens', {
		chromatic_aberration: 0,       // from 0 to x (1 for realism)
        edge_blur: 0,                  // from 0 to x (1 for realism)
        distortion: 0,                 // from 0 to x (1 for realism)
        grain_amount: 0,               // from 0 to 1 (use grain_texture to set custom Texture)
        dof_focus_distance: 0,         // depth-of-field: focus distance; unset to disable (disabled by default)
        dof_aperture: 1,               // depth-of-field: focus blur bias (default: 1) ---- DISABLED THIS BECAUSE IT GLITCHES ON LOW-FOV NON-ORTHO CAMERAS
        dof_darken: 0,                 // depth-of-field: darken that which is out of focus (from 0 to 1, disabled by default)
        dof_pentagon: false,           // depth-of-field: makes a pentagon-like "bokeh" effect
        dof_gain: 0,                   // depth-of-field: highlights gain; unset to disable (disabled by default)
        dof_threshold: 1,              // depth-of-field: highlights threshold (default: 1)
        blur_noise: false              // add a little bit of noise to the blur (default: true)
	}, scene01, 1.0, [camera01]);

    //////////////////////////////////////
    // ABOVE: Main Scene
    //////////////////////////////////////
    // BELOW: Optimization 
    ////////////////////////////////////// https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene

    const opti = scene01.getMeshByName("cubeScene");
    opti.material.freeze(); // like "const" but for materials (unfreeze when needed to change)
    opti.freezeWorldMatrix(); // like "const" but for mesh transforms
    opti.doNotSyncBoundingInfo = true; // like "const" but for mesh picking/collisions  
    scene01.skipPointerMovePicking = true; // disable checking raycasted selections of meshes under pointer
    // IN THE FUTURE: use Instances for duplicated objects, Clones for duplicated meshes (no backface culling available if clones have different transformations and such)
    scene01.autoClear = false; // disables unnecessary computations for transparent canvases
    scene01.autoClearDepthAndStencil = false; // (use .setRenderingAutoClearDepthStencil() if you have RenderingGroups)
    // ITF: for advanced scenes, use material.needDepthPrePass for early depth test rejection
    // ITF: for VERY simple meshes where not many faces share vertices, use mesh.convertToUnIndexedMesh()
    // ITF: for non-mobile apps, you can remove the fourth parameter in new Engine() to disable adaptToDeviceRatio
    scene01.blockMaterialDirtyMechanism = true; // disable flagging dirty materials that need changing if you aren't busy updating them
    // ITF: for slower devices, use scene.getAnimationRatio() to sync to the framerate on non-Animation objects if needed
    // ITF: for advanced multi-GPU stuff or GPU power selection, look into doNotHandleContextLost and powerPreference
    // ITF: to speed up adding multiple meshes, you can spend system/video memory in exchange for the following Scene constructor options:
    // -- useGeometryIdsMap - speeds up adding/removing Geometry by mapping them to begin with
    // -- useMaterialMeshMap - speeds up Material disposal (reduces time spent searching for bound meshes by mapping them to begin with)
    // -- useClonedMeshMap - speeds up Mesh disposal (reduces time spent searching for clones by mapping them to begin with)
    // ITF: if you're disposing many meshes at once, enable scene.blockfreeActiveMeshesAndRenderingGroups before you do it and then re-disable it
    // ITF: for the culling process (picking meshes to GPU-render from being in the camera frustum,) you can change the bounding box from sphere to box with mesh.cullingStrategy to speed up checking for scenes with lots of meshes spread-out (but not a good idea for high-poly meshes)
    // ITF: if you maintain your app regularly, you can quickly optimize your scene with scene.performancePriority:
    // -- ScenePerformancePriority.BackwardCompatible - DEFAULT, keeps things working as-is for a long time without running checks on new features
    // -- ScenePerformancePriority.Intermediate - auto-freezes materials, sets all meshes to alwaysSelectAsActiveMesh (CPU-bound) and disables isPickable, turns on scene.skipPointerMovePicking, and turns off scene.autoClear
    // -- ScenePerformancePriotity.Aggressive - enables all of the above, enables scene.skipFrustumClipping, turns on doNotSyncBoundingInfo for meshes, and automatically disables rendering invisible/transparent meshes (scene.renderingManager.maintainStateBetweenFrames)
    // ITF: for multiple camera views of one scene, look into MultiViews

    // INSTRUMENTATION FOR SCENE DEBUGGING
    /* const instrumentation = new EngineInstrumentation(_engine);
    instrumentation.captureGPUFrameTime = true; // gpuFrameTimeCounter (GPU: one frame rendered in x nanoseconds. also contains other properties because perfCounter object type. requires enabling EXT_DISJOINT_TIMER_QUERY but WARNING! PART OF Spectre/Meltdown EXPLOITS. test at https://registry.khronos.org/webgl/sdk/tests/conformance/extensions/ext-disjoint-timer-query.html)
    instrumentation.captureShaderCompilationTime = true; // shaderCompilationTimeCounter (CPU: shaders compiled in x nanoseconds. also contains other properties because perfCounter object type)
    // ITF: for even more advanced debug values, use SceneInstrumentation

    scene01.registerBeforeRender(function () {
        console.log("CURRENT FRAME TIME (GPU): " + (instrumentation.gpuFrameTimeCounter.current * 0.000001).toFixed(2) + "ms");
        console.log("AVERAGE FRAME TIME (GPU): " + (instrumentation.gpuFrameTimeCounter.average * 0.000001).toFixed(2) + "ms");
        console.log("TOTAL SHADER COMP TIME: " + (instrumentation.shaderCompilationTimeCounter.total).toFixed(2) + "ms");
        console.log("AVERAGE SHADER COMP TIME: " + (instrumentation.shaderCompilationTimeCounter.average).toFixed(2) + "ms");
        console.log("COMPILER SHADER COUNT: " + instrumentation.shaderCompilationTimeCounter.count);
    }); */

    // Above all else, use the Inspector browser extension to count total draw calls

    //////////////////////////////////////
    // ABOVE: Optimization
    //////////////////////////////////////
    // BELOW: Frame Updates
    //////////////////////////////////////

    // On every frame...
    _engine.runRenderLoop(() => { 
        // Update the camera
        updateCameraView(camera01, shotNumber);

        // Update the depth of field distance
        postLens.setFocusDistance(Number(Vector3.Distance(camera01.position, guy.position)));

        // And render our (only) scene
        scene01.render(); 
    });
    
    // Resize camera to fit window
    window.addEventListener('resize', () => { _engine.resize(); });
};

/////////////////////////
/////// OBJECTS
/////////////////////////

// this could just be a function, but lets make it an object to look professional
class guiButton {
    private _name: string;
    public num: number; // these should be methods instead of publics but idc
    public HTML: HTMLButtonElement;

    constructor(buttonNum: number, gui: HTMLDivElement) {
        const button: HTMLButtonElement = document.createElement("button");
        button.id = "guiB" + String(buttonNum);
        button.classList.add("gui__button");
        button.innerText = String(buttonNum);
        button.onclick = function() { changeView(buttonNum, button) };
        gui.appendChild(button);

        this._name = button.id;
        this.num = buttonNum;
        this.HTML = button;

        return this;
    }
}

/////////////////////////
/////// FUNCTIONS
/////////////////////////

// set camera angle by number
async function updateCameraView(cam: ArcRotateCamera, view: number) {
    if (view === 1) {
        cam.setTarget(camTargetA);
        cam.setPosition(Vector3.Lerp(cam.position, camView1, lerpAmount));
    } else if (view === 2) {
        cam.setTarget(camTargetB);
        cam.setPosition(Vector3.Lerp(cam.position, camView2, lerpAmount));
    } else {
        cam.setTarget(camTargetB);
        cam.setPosition(Vector3.Lerp(cam.position, camView3, lerpAmount));
    }
}

// play a sound and animate the button while switching views
async function changeView(num: number, button: HTMLButtonElement) {
    
    // play a sound effect (NOTE: USING AUDIO IN-SCENE REQUIRES CHECKING FOR Web Audio API, DISABLED BY SOME FIREFOX USERS FOR FINGERPRINTING)
    guiSoundClick.play();

    // deselect previous button
    guiActiveButton.classList.remove("gui__button--chosen");
    guiActiveButton.classList.remove("gui__button--pressed"); // bugfix for holding down a key then switching

    // set the camera to that button's shot
    shotNumber = num;

    // select new button
    guiActiveButton = button;
    guiActiveButton.classList.add("gui__button--chosen");

    // and animate it being pressed
    guiActiveButton.classList.add("gui__button--pressed");
    await sleep(80);
    guiActiveButton.classList.remove("gui__button--pressed");
}

/* 
// handy function for if you ever scene.activeCamera.mode = Camera.ORTHOGRAPHIC_CAMERA;

async function autoResizeOrthographicCamera(scene: Scene, camera: Camera, zoom: number) {

    // get the canvas size
    const canvasSize = scene.getEngine().getInputElementClientRect();

    // retrieve orthographic value from canvas size
    const orthoHeightValue = canvasSize.height / 100;
    const orthoWidthValue = canvasSize.width / 100;

    // set the orthigraphic values to the camera
    camera.orthoBottom = -orthoHeightValue / zoom;
    camera.orthoTop = orthoHeightValue / zoom;
    camera.orthoLeft = -orthoWidthValue / zoom;
    camera.orthoRight = orthoWidthValue / zoom;
} 
*/

// Now let's check if we have WebGL...
const test = document.createElement('canvas').getContext('webgl');
if (test) {
    
    // Intro screen that enables audio
    document.querySelector('#intro').innerHTML = `
        <p id="p__code">WTZ01</p>
        <h1>Camera Snap</h1>
        <h2>📦</h2>
        <div class="div__marquee"></div>
    `

    // insert our button that launches Babylon.js
    launchButton = document.createElement("button");
    launchButton.id = "button__GO";
    launchButton.innerText = "LAUNCH >>";
    launchButton.onclick = function() {
        document.querySelector('#intro').remove();
        App(); // start the app!
    };
    document.querySelector(".div__marquee").appendChild(launchButton);

} else {
    
    // no WebGL? no app
    document.querySelector('#p__noJS').innerHTML = `
        <span style="color: #FF3333;"><b>WebGL failed to load. Please use a modern browser that supports it before continuing.</b><br><br><em>(Advanced users: If you disabled WebGL in your browser config, please enable it and use <a href="https://noscript.net/" target="_blank" rel="noreferrer" style="color: #FF3333;">NoScript</a> instead. It will let you whitelist the current domain while still blocking other WebGL websites via custom trust levels. I don't track or fingerprint you.)</em></span>
    `

}
