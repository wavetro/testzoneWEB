///////////////////////////////////////
// █████████████████████████████████ //
// █▄─█▀▀▀█─▄█─▄─▄─█░▄▄░▄█─▄▄─█▀▄▄▀█ //
// ██─█─█─█─████─████▀▄█▀█─██─██▀▄██ //
// ▀▀▄▄▄▀▄▄▄▀▀▀▄▄▄▀▀▄▄▄▄▄▀▄▄▄▄▀▄▄▄▄▀ //
///////////////////////////////////////

///////////////////////////////////////
// Imports and Globals
///////////////////////////////////////

import { Engine, Scene, Vector3, Mesh, HemisphericLight, AmmoJSPlugin, SceneLoader, ArcRotateCamera, MeshBuilder, StandardMaterial, Texture, PhysicsImpostor, AbstractMesh, PhysicsImpostorParameters, Matrix, Sound, ActionManager, ExecuteCodeAction, Color3} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import ammo from 'ammojs-typed';

const camFOV: number =             1;
const objMass: number =            1;
const objFric: number =            0.5;
const r1: number =                 10; // range of random physics impulse magnitude
const r2: number =                 20;
const rdur: number =               100; // millisecond of how long impulse lasts
const camD1: number =              3;
const camD2: number =              4; // lower and upper distances for camera (desktop vs mobile)
const velThreshold: number =       1; // velocity needed in a collision to trigger a sound
const sfxVolume: number =          1; // volume of each sound effect
const weeDist: number =            1.6; // distance from house center to set off wee.mp3

let sfx: Map<String, Sound> =  new Map(); // this is where we store all our sound effects
let camDistance: number =          camD1;
let resetting: boolean =           false; // prevent spamming reset [R] and freezing everything
let defaultGrav: Vector3 =         new Vector3(0, 0, 0);
let colliders: PhysicsImpostor[] = []; // stores our colliders (physicsImpostor)
let leftInside: string[] =         [ // which objects are stuck in the house?
    'table', 'chair.000', 'chair.001', 'picture', 'plate.000', 'plate.001', 'compoundLamp'
];
let menuOpen: boolean =            false; // store our info menu state (closed or open)
let modalClick: boolean =          false;
let scrollOnce: boolean =          true; // only show the scroll animation once

let _canvas: HTMLCanvasElement;
let _engine: Engine;

///////////////////////////////////////
// Main App
///////////////////////////////////////

const App = async function() {

    _canvas = document.createElement("canvas"); // place in our HTML canvas and Engine (we need those at all times)
    document.body.appendChild(_canvas);

    _engine = new Engine(_canvas, true, null, true);
    Engine.audioEngine.useCustomUnlockedButton = true; // disable automatic mute icon
    
    // fit camera to window on every resize (doing this here means we don't have to use removeEventHandler)
    window.addEventListener('resize', () => { 
        _engine.resize(); 
        setCamDistance();
    });

    loadScene01();

};

///////////////////////////////////////
// Main Scene
///////////////////////////////////////

async function loadScene01() {

    // Start with our loading screen
    document.body.insertAdjacentHTML(
        'beforeend', 
        `<div class="darkBGcentered loadingText"><span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span></div>`
    );
    
    // Do an initial aspect ratio check
    setCamDistance();

    ///////////////////////////////////////
    // Setup
    ///////////////////////////////////////

    // Initialize base scene and camera pointed at scene origin
    const scene01: Scene = new Scene(_engine);
    scene01.useRightHandedSystem = true; // use the "handedness" of the GLTF to make life easier for the loader
    const camera01: ArcRotateCamera = new ArcRotateCamera("cam01", 2*Math.PI, Math.PI/2, camDistance, new Vector3(0, 1, 0), scene01);
    camera01.fov = camFOV;

    // Add a 2D image background
    const skyPlane: Mesh = MeshBuilder.CreatePlane("sky", {size:280.0}, scene01);
    skyPlane.rotation = new Vector3(0, -Math.PI/2, 0);
    skyPlane.position = new Vector3(-100, 1, 0);
    skyPlane.scaling = new Vector3(-1, 1, 1);
    const skyTexture: StandardMaterial = new StandardMaterial("skyTex", scene01);
    skyTexture.diffuseTexture = new Texture("./files/sky.jpg", scene01);
	skyPlane.material = skyTexture;

    // And an okay-ish blue skybox for gigantic widescreens
    const skyBox: Mesh = MeshBuilder.CreateBox("skyBox", {size:10000.0}, scene01);
    const skyMaterial: StandardMaterial = new StandardMaterial("skyMat", scene01);
    skyMaterial.backFaceCulling = false;
    skyMaterial.emissiveColor = new Color3(0, 0.4, 0.7);
    skyBox.material = skyMaterial;

    // Makeshift global illumination
    const globalLightA: HemisphericLight = new HemisphericLight("GlobalLightA", new Vector3(0, 2, 2), scene01);
    const globalLightB: HemisphericLight = new HemisphericLight("GlobalLightB", new Vector3(0, -2, -2), scene01);
    globalLightA.intensity = 2;
    globalLightB.intensity = 0.2;
    globalLightA.excludedMeshes.push(skyBox);
    globalLightB.excludedMeshes.push(skyBox);

    // Set up our Ammo.js physics engine (fuck you Cannon)
    const Ammo = await ammo.call({});
    scene01.enablePhysics(defaultGrav, new AmmoJSPlugin(true, Ammo));

    ///////////////////////////////////////
    // 3D Assets & Sounds
    ///////////////////////////////////////

    // Load in our scene assets by importing our GLB and use destructuring to grab its meshes 
    const {meshes} = await SceneLoader.ImportMeshAsync('', "./files/", "house.glb", scene01);

    // Load our sounds
    sfx.set('table', new Sound("tableHit", "./files/woodDebrisFall.mp3", scene01, null, { volume: sfxVolume }));
    sfx.set('lamp', new Sound("lampHit", "./files/metalSurfaceHit.mp3", scene01, null, { volume: sfxVolume }));
    sfx.set('chair.000', new Sound("chairHit1", "./files/smashKnockWood.mp3", scene01, null, { volume: sfxVolume }));
    sfx.set('chair.001', new Sound("chairHit2", "./files/windowSlideClosed.mp3", scene01, null, { volume: sfxVolume }));
    sfx.set('plate.000', new Sound("plateHit1", "./files/soupPlateHit.mp3", scene01, null, { volume: sfxVolume }));
    sfx.set('plate.001', new Sound("plateHit2", "./files/clarkeMug.mp3", scene01, null, { volume: sfxVolume * 0.4 })); // very compressed
    sfx.set('picture', new Sound("pictureHit", "./files/framedPictureWood.mp3", scene01, null, { volume: sfxVolume }));
    sfx.set('wee', new Sound("objectGone", "./files/wee.mp3", scene01, null, { volume: sfxVolume }));

    // Now for every mesh...
    meshes.forEach(mesh => {
        if (mesh.parent) { // grab its parent (if it exists)

            if(mesh instanceof Mesh){
                const parentTransform: Matrix = mesh.parent.getWorldMatrix(); // store its parent's world coordinates in a variable
                mesh.bakeTransformIntoVertices(parentTransform); // directly apply the coordinates to the object
            }

            mesh.parent = null; // discard the parent now that the (child) mesh's transformation is applied

            if (mesh.name !== 'house' && mesh.name !== 'lamp') { // and give the object a collider (excluding the house and lamp)
                addImpostor(scene01, mesh, PhysicsImpostor.BoxImpostor, { mass: objMass, friction: objFric });

                // push the collider to our array
                colliders.push(mesh.physicsImpostor);

                // and give it a sound effect function every time it collides into something
                mesh.physicsImpostor.registerOnPhysicsCollide(colliders, (self) => {
                    // check if the object speed is less than velThreshold
                    if (Vector3.Distance(self.getLinearVelocity(), Vector3.Zero()) > velThreshold) {
                        // don't stack the sounds!
                        if (!sfx.get(mesh.name).isPlaying) {
                            sfx.get(mesh.name).play();
                        }
                    }
                });
                
            } else { // (the house and lamp get different colliders instead)
                
                if (mesh.name === 'house') { // if mass = 0 (doesn't move) you can use a mesh collider
                    addImpostor(scene01, mesh, PhysicsImpostor.MeshImpostor, { mass: 0 });

                    mesh.physicsImpostor.registerOnPhysicsCollide(colliders, (self) => {
                        if (Vector3.Distance(self.getLinearVelocity(), Vector3.Zero()) > velThreshold) {
                            if (!sfx.get(mesh.name).isPlaying) {
                                sfx.get(mesh.name).play();
                            }
                        }
                    });
                }

                else if (mesh.name === 'lamp') { // but if you're the lamp, you'll need a compound collider
                    
                    // let's create two invisible box meshes to outline the lamp
                    const lampColliderA: Mesh = MeshBuilder.CreateBox("lampColA", { height: 0.15, width: 0.3, depth: 0.3 });
                    lampColliderA.position = new Vector3(0, 1.4, 0);
                    lampColliderA.isVisible = false;
                    
                    const lampColliderB: Mesh = MeshBuilder.CreateBox("lampColB", { height: 0.4, width: 0.05, depth: 0.05 });
                    lampColliderB.position = new Vector3(0, 1.6, 0);
                    lampColliderB.isVisible = false;

                    // now let's add all our meshes into a new object
                    const compoundLamp = new Mesh("compoundLamp", scene01);
                    compoundLamp.position.y += 1.5;
                    compoundLamp.addChild(mesh);
                    compoundLamp.addChild(lampColliderA);
                    compoundLamp.addChild(lampColliderB);

                    // and then put impostors on our two boxes instead
                    lampColliderA.physicsImpostor = new PhysicsImpostor(lampColliderA, PhysicsImpostor.BoxImpostor, { mass: 0 }, scene01);
                    lampColliderB.physicsImpostor = new PhysicsImpostor(lampColliderB, PhysicsImpostor.BoxImpostor, { mass: 0 }, scene01);
                    compoundLamp.physicsImpostor = new PhysicsImpostor(compoundLamp, PhysicsImpostor.NoImpostor, { mass: objMass, friction: objFric }, scene01);
                    
                    // and then do the rest as usual
                    colliders.push(compoundLamp.physicsImpostor);

                    compoundLamp.physicsImpostor.registerOnPhysicsCollide(colliders, (self) => {
                        if (Vector3.Distance(self.getLinearVelocity(), Vector3.Zero()) > velThreshold) {
                            if (!sfx.get(mesh.name).isPlaying) {
                                sfx.get(mesh.name).play();
                            }
                        }
                    });
                }
            }
        }
    });

    // put an invisible wall so things don't fly out the front
    const invisWall: Mesh = MeshBuilder.CreateBox("invisWallFront", { height: 2, width: 2, depth: 0.05 });
    invisWall.rotation.y = Math.PI / 2;
    invisWall.position = new Vector3(0.5, 1, 0);
    addImpostor(scene01, invisWall, PhysicsImpostor.BoxImpostor, { mass: 0 });
    invisWall.isVisible = false;

    scene01.getMeshByName("__root__").dispose(); // don't need this anymore!

    // check if any objects fly out of our house so we can play the wee sound
    scene01.registerBeforeRender(() => {
        for (let i = 0; i < leftInside.length; i++) { // this feels inefficient and bad but the forums say that all objects get iterated over anyway
            let current = scene01.getMeshById(leftInside[i]);

            if (current !== null && current instanceof Mesh) {
                if (Vector3.Distance(current.position, new Vector3(0, 1, 0)) > weeDist) { // play wee.mp3 if more than weeDist units away
                    leftInside.splice(leftInside.indexOf(current.name), 1);
                    sfx.get('wee').play();
                    if (leftInside.length === 0) {
                        document.body.insertAdjacentHTML( 
                            'beforeend', 
                            `
                            <div style="font-size: 3rem; display: flex; justify-content: center; position: relative; align-items: center; height: 100%; color: #000000;"><b>how</b></div>
                            `
                        );
                    }
                }
            }
        }
    });

    ///////////////////////////////////////
    // Controls & GUI
    ///////////////////////////////////////

    // Load in our scene01 tap/click controls
    scene01.onPointerDown = () => { 
        agitate(scene01);
    };

    // Load in our GUI menu
    document.body.insertAdjacentHTML( // i know doing these in-line SVGs blows up the file size of the code; maybe i will do a proper import from an external SVG file next time. or maybe i won't
        'beforeend', 
        `
        <div class="gui">
            <button id="gui__reset"><svg viewBox="0 0 40.132 51.307999" xmlns="http://www.w3.org/2000/svg" role="img"><title>Reset symbol</title><path d="M 7.0612,40.741599 C 6.8241333,40.572265 6.604,40.402932 6.4008,40.233599 l -0.6096,-0.6096 C 3.9285333,37.727465 2.4892,35.576932 1.4732,33.172399 0.49106667,30.733999 0,28.193999 0,25.552399 c 0,-2.980267 0.6096,-5.757334 1.8288,-8.3312 1.2192,-2.573867 2.9125333,-4.792134 5.08,-6.6548 2.1674667,-1.8965337 4.639733,-3.2681337 7.4168,-4.1148003 L 14.0716,-1.3427734e-6 24.2824,8.4327987 14.732,18.643599 l -0.254,-7.5184 c -1.998133,0.778933 -3.742267,1.913466 -5.2324,3.4036 -1.4562667,1.456266 -2.5908,3.1496 -3.4036,5.08 -0.7789333,1.896533 -1.1684,3.9116 -1.1684,6.0452 0,1.998133 0.3894667,3.945466 1.1684,5.842 0.7789333,1.862666 1.8965333,3.522133 3.3528,4.9784 0.1016,0.135466 0.2032,0.254 0.3048,0.3556 0.1354667,0.1016 0.2709333,0.220133 0.4064,0.3556 z m 18.9484,10.5664 -10.1092,-8.4836 9.4996,-10.2108 0.254,7.5692 c 1.998133,-0.778934 3.725333,-1.896534 5.1816,-3.3528 1.456267,-1.456267 2.5908,-3.132667 3.4036,-5.0292 0.8128,-1.9304 1.2192,-3.9624 1.2192,-6.096 0,-2.032 -0.389467,-3.996267 -1.1684,-5.8928 -0.745067,-1.896534 -1.845733,-3.572934 -3.302,-5.0292 l -0.4064,-0.3048 C 30.48,14.342532 30.361467,14.207065 30.226,14.071599 l 2.9972,-3.4036 c 0.169333,0.135466 0.3556,0.287866 0.5588,0.4572 0.2032,0.169333 0.4572,0.4064 0.762,0.7112 1.794933,1.761066 3.166533,3.8608 4.1148,6.2992 0.982133,2.404533 1.4732,4.893733 1.4732,7.4676 0,2.980266 -0.6096,5.774266 -1.8288,8.382 -1.2192,2.607733 -2.912533,4.859866 -5.08,6.7564 -2.1336,1.862666 -4.6228,3.217333 -7.4676,4.064 z" ></path></svg></button>
            <br>
            <button id="gui__info"><svg viewBox="0 0 46.634399 46.634404" xmlns="http://www.w3.org/2000/svg" role="img"><title>Info symbol</title><path d="m 23.3172,46.634403 c -3.217334,0 -6.231467,-0.6096 -9.0424,-1.8288 -2.810934,-1.185333 -5.3001343,-2.8448 -7.4676003,-4.9784 -2.1336,-2.167466 -3.81,-4.656668 -5.0292,-7.467604 C 0.59266571,29.548666 -2.9296875e-7,26.534533 -2.9296875e-7,23.3172 -2.9296875e-7,20.099867 0.59266571,17.085734 1.7779997,14.2748 c 1.2192,-2.810933 2.8956,-5.2831998 5.0292,-7.4167998 2.167466,-2.167466 4.6566663,-3.843866 7.4676003,-5.0292 C 17.085733,0.60960023 20.099866,2.2875976e-7 23.3172,2.2875976e-7 c 3.217333,0 6.231466,0.60960000124024 9.0424,1.82879997124024 2.810932,1.185334 5.283199,2.861734 7.416799,5.0292 2.167466,2.1336 3.843866,4.6058668 5.0292,7.4167998 1.2192,2.810934 1.8288,5.825067 1.8288,9.0424 0,3.217333 -0.6096,6.231466 -1.8288,9.042399 -1.185334,2.810936 -2.861734,5.300138 -5.0292,7.467604 -2.1336,2.1336 -4.605867,3.793067 -7.416799,4.9784 -2.810934,1.2192 -5.825067,1.8288 -9.0424,1.8288 z m 0,-4.3688 c 2.607733,0 5.046133,-0.491066 7.3152,-1.4732 2.302933,-0.982133 4.317999,-2.3368 6.045199,-4.064 1.761066,-1.761069 3.132666,-3.776137 4.1148,-6.045204 0.982133,-2.302933 1.4732,-4.758266 1.4732,-7.365999 0,-2.607733 -0.491067,-5.046133 -1.4732,-7.3152 -0.982134,-2.302933 -2.353734,-4.318 -4.1148,-6.0451998 -1.7272,-1.761066 -3.742266,-3.132666 -6.045199,-4.1148 -2.269067,-0.982133 -4.707467,-1.4732 -7.3152,-1.4732 -2.607734,0 -5.063067,0.491067 -7.366,1.4732 -2.269067,0.982134 -4.284134,2.353734 -6.0452003,4.1148 -1.7272,1.7271998 -3.081867,3.7422668 -4.064,6.0451998 -0.982134,2.269067 -1.4732,4.707467 -1.4732,7.3152 0,2.607733 0.491066,5.063066 1.4732,7.365999 0.982133,2.269067 2.3368,4.284135 4.064,6.045204 1.7610663,1.7272 3.7761333,3.081867 6.0452003,4.064 2.302933,0.982134 4.758266,1.4732 7.366,1.4732 z m 0,-27.228803 c -0.745067,0 -1.405467,-0.169333 -1.9812,-0.508 -0.541867,-0.372533 -0.8128,-1.032933 -0.8128,-1.9812 0,-1.016 0.287866,-1.6764 0.8636,-1.9812 0.6096,-0.338666 1.253066,-0.508 1.9304,-0.508 1.8288,0 2.7432,0.829734 2.7432,2.4892 0,0.948267 -0.287867,1.608667 -0.8636,1.9812 -0.575734,0.338667 -1.202267,0.508 -1.8796,0.508 z M 20.7264,36.068003 V 17.3736 h 5.1308 v 18.694403 z" ></path></svg></button>
        </div>
        `
    );

    // Add the resetting mechanism (button click)
    document.getElementById('gui__reset').addEventListener("click", () => { // normally you should not put an arrow function on addEventListener in a place that will get called multiple times since it won't be deleted (meaning memory leakage,) but this is so tiny it's fine
        if (!resetting) {
            scene01.dispose();
            resetScene01();
        }
    });

    // Add the resetting mechanism (R key via Action Manager)
    scene01.actionManager = new ActionManager(scene01);

    scene01.actionManager.registerAction(
        new ExecuteCodeAction(
            {
                trigger: ActionManager.OnKeyUpTrigger,
                parameter: 'r'
            },
            () => { 
                if (!resetting) {
                    scene01.dispose();
                    resetScene01();
                }
            }
        )
    );

    // Add a spacebar control to shake everything too
    scene01.actionManager.registerAction(
        new ExecuteCodeAction(
            {
                trigger: ActionManager.OnKeyUpTrigger,
                parameter: ' '
            },
            () => { 
                agitate(scene01);
            }
        )
    );

    // Open a modal when you click the button...
    document.getElementById('gui__info').addEventListener("click", () => { 
        if (!menuOpen) {
            modalOpen();
        }
    }); 
    
    // ...or toggle it on with I
    document.addEventListener("keydown", IKeyHandler); // (removeEventListener won't work without a named or non-anonymous function)

    ///////////////////////////////////////
    // Optimization & Loops
    ///////////////////////////////////////

    scene01.skipPointerMovePicking = true; // disable checking raycasted selections of meshes under pointer
    scene01.autoClear = false; // disables unnecessary computations for transparent canvases
    scene01.autoClearDepthAndStencil = false;
    scene01.blockMaterialDirtyMechanism = true; // disable flagging dirty materials that need changing if you aren't busy updating them

    // Toss away the loading screen
    document.querySelector('.loadingText').remove();

    // Now on every frame...
    _engine.runRenderLoop(() => { 
        scene01.render(); // render our (only) scene

        if (menuOpen) { // pause our physics while the menu is open to prevent overloading our single thread
            scene01.physicsEnabled = false;
        } else {
            scene01.physicsEnabled = true;
        }
    });
}

///////////////////////////////////////
// Extra Functions
///////////////////////////////////////

// Thank you Babylon forums for showing the proper way to do this because the .GLTF/.GLB parenting screws up physics (https://forum.babylonjs.com/t/loading-gltf-and-physics-not-working-what-am-i-missing/4878)
function addImpostor(scene: Scene, mesh: AbstractMesh, impostor: number, options: PhysicsImpostorParameters) {
    
    if (mesh == null) { return; } // exit if the mesh doesn't exist

    mesh.checkCollisions = false; // disable Babylon's default mesh collision checker because the physics engine will do it for us

    mesh.physicsImpostor = new PhysicsImpostor(mesh, impostor, options, scene); // creates the mesh's collider/hitbox
}

function setCamDistance() { // adjust scene01's camera distance based on the aspect ratio of our window
    if ((window.screen.width * window.devicePixelRatio)/(window.screen.height * window.devicePixelRatio) <= 1.2) {
        camDistance = camD2;
    } else {
        camDistance = camD1;
    }
}

function agitate(scene: Scene) { // shake the scene and then return to either zero grav or normal grav
    scene.getPhysicsEngine().setGravity(new Vector3(randomVector(r1, r2), randomVector(r1, r2), randomVector(r1, r2)));
    setTimeout(() => { scene.getPhysicsEngine().setGravity(defaultGrav) }, rdur);
}

function randomVector(min: number, max: number) { // (part of function above)
    let absVal: number = Math.random() * (max - min) + min;
    if (Math.random() < 0.5) {
        return absVal * -1;
    }
    return absVal;
}

function IKeyHandler(e: KeyboardEvent) { // I hate that we have to do this for removeEventHandler to work
    if (e.key === "i") {
        if (!menuOpen) {
            modalOpen();
        } else { 
            modalClose();
        }
    }
}

function modalOpen() { // open our info modal
    document.body.insertAdjacentHTML(
        'beforeend', 
        `
        <div class="darkBGcentered">
            <div id="gui-modal">
                <svg id="gui-modal__madeby" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 566.2851 185.74837" role="img"><title>AGPLv3 license badge</title><path fill="#EEEEEE" d="m 539.10741,8.1e-5 -0.10156,0.0078 C 530.71826,0.60565 519.6936,3.1037008 509.22851,7.2988968 H 450.15038 166.24609 39.5918 L 0,180.03915 h 104.17187 183.16406 74.38281 c 5.46058,3.17921 12.07501,5.05397 19.47852,5.69922 l 0.12305,0.01 h 12.96093 l 0.11133,-0.008 c 4.14371,-0.32333 8.46663,-0.92471 12.93555,-1.79882 7.70474,-1.50661 15.83423,-3.81208 24.25586,-6.88282 6.37429,-2.32414 12.91874,-5.07247 19.55664,-8.26367 v -0.002 c 14.44638,-6.92551 29.34058,-15.84243 43.94726,-26.59571 4.8134,-3.54063 9.42994,-7.1717 13.86133,-10.86328 4.0644,-3.38174 7.96606,-6.81789 11.69336,-10.29296 l 0.0176,-0.0156 0.0156,-0.0156 c 10.46889,-10.08915 18.42241,-20.34812 23.03321,-29.617182 2.4016,-4.827089 3.90875,-9.392039 4.28515,-13.630869 0.3765,-4.23884 -0.43861,-8.25159 -2.82031,-11.39844 -1.7462,-2.3111 -4.19927,-3.84016 -7.01367,-4.84766 9.16429,-7.52538 16.62518,-15.56018 21.51758,-23.42382 5.71329,-9.18295 8.26045,-18.286107 5.47265,-25.947269 v -0.002 C 563.36589,7.2219638 559.32807,3.5230608 554.01757,1.6075028 v -0.002 C 551.65877,0.757164 549.07861,0.24263 546.32421,0.0098 L 546.20507,0 Z m 0.26368,5.6914068 h 0.006 6.51562 c 2.3253,0.200379 4.40952,0.627662 6.19531,1.269531 4.046,1.459418 6.5355,3.8640102 7.7168,7.1230472 v 0.002 0.002 c 1.8778,5.154965 0.25442,12.62276 -4.95508,20.99609 -5.20949,8.37324 -13.82207,17.45116 -24.75976,25.65821 l -6.03711,4.53125 7.52539,0.58203 c 4.45209,0.34483 7.38379,1.72281 9.05859,3.93945 v 0.0019 c 1.3728,1.81396 1.97735,4.21968 1.68946,7.46094 -0.2878,3.24127 -1.53024,7.21652 -3.71094,11.599614 -4.188,8.419068 -11.77268,18.30523 -21.88477,28.05079 v 0.002 c -3.63709,3.38976 -7.44462,6.74444 -11.41601,10.04882 v 0.002 c -4.3484,3.62247 -8.87686,7.18279 -13.59375,10.65234 -14.33019,10.54989 -28.93143,19.28696 -43.03711,26.04883 v 0.002 c -6.4724,3.11179 -12.84588,5.78734 -19.04297,8.04688 -8.17544,2.98097 -16.0276,5.20321 -23.39844,6.64453 -4.24791,0.83089 -8.33247,1.39525 -12.2168,1.70117 h -12.40039 c -0.0484,-0.004 -0.0923,-0.0132 -0.14062,-0.0176 h 1.12109 c -11.34892,-0.99044 -20.30973,-4.97395 -25.64844,-12.23633 -0.99022,-1.34338 -1.80838,-2.79075 -2.52539,-4.30468 -0.45543,-1.11547 -0.88372,-2.2407 -1.3164,-3.37891 -1.1384,-3.62001 -1.59169,-7.63774 -1.38672,-11.91797 0.56922,-11.92961 6.16675,-26.1188 15.86523,-40.97851 10.3017,-15.791772 25.23249,-32.343854 43.71875,-47.703144 4.14352,-3.43997 8.42731,-6.83737 12.91211,-10.13867 5.54366,-4.07841 11.12976,-7.83487 16.71875,-11.34766 20.59208,-12.964339 41.13416,-22.03473 59.33594,-26.642576 -17.39358,5.674435 -36.93435,15.307366 -56.24023,28.421876 -0.6945,0.4689 -1.38126,0.94822 -2.06446,1.42187 -10.71139,7.42184 -20.4157,15.30545 -28.88476,23.26563 -27.25149,25.623589 -41.65476,52.175334 -35.10938,67.730484 0.46672,1.06995 1.02314,2.09091 1.67188,3.05859 7.03486,10.34719 24.46966,12.13504 46.56445,6.58008 1.50267,-0.37552 3.00474,-0.80018 4.55273,-1.24414 7.0576,-2.03745 14.55174,-4.78953 22.26954,-8.18164 1.85539,-0.81968 3.72954,-1.66309 5.61914,-2.5625 0.1935,-0.091 0.37691,-0.18071 0.57031,-0.2832 24.36017,-12.10371 43.08042,-26.03068 47.13281,-34.398442 0.8879,-1.82019 1.10145,-3.37308 0.49805,-4.589853 -2.8913,-5.862419 -23.12269,-1.902225 -47.63086,8.714853 -1.9691,0.853902 -3.96167,1.732362 -5.97656,2.667972 1.63909,-1.52183 3.34454,-3.049112 5.08593,-4.552742 2.7776,-2.39277 5.6547,-4.73211 8.7168,-7.042973 4.7923,-3.628909 9.63646,-6.910009 14.40625,-9.818369 22.33378,-16.84945 33.62398,-32.78829 31.26758,-38.70312 -0.4439,-1.11446 -1.38851,-1.88073 -2.8457,-2.34766 -4.6557,-1.48088 -13.15218,0.28643 -23.47657,4.51758 -8.51479,3.49242 -18.29429,8.6727 -28.20898,15.11914 l -1.35352,0.88867 -0.24804,0.14258 -4.76758,3.16602 2.74023,-5.01563 c 4.0638,-7.43906 10.68254,-15.20001 18.92383,-22.41015 6.04439,-5.27165 12.94972,-10.23982 20.38281,-14.585941 2.8116,-1.646089 5.61995,-3.174326 8.43164,-4.552735 2.88,-1.407088 5.76067,-2.658195 8.57227,-3.771484 2.5081,-0.991869 5.09242,-2.004528 7.66601,-3.0292972 0,-0.001 0.01,-0.0029 0.01,-0.0039 7.61559,-2.412446 15.11857,-3.884836 20.81641,-4.300781 z m -191.38477,1.857422 c -1.11547,17.0257522 2.18568,41.9630622 9.67578,69.6503922 1.3319,4.9266 2.78134,9.94049 4.375,15.011726 0.99042,3.13152 2.01335,6.21327 3.06055,9.248042 -0.61472,0.90378 -1.23376,1.80154 -1.81445,2.70313 -9.34552,14.32217 -14.80814,27.85877 -16.18555,39.62891 -3.95003,-13.22728 -6.9245,-27.7153 -8.60938,-43.07813 -0.478,-4.401722 -0.85109,-8.754082 -1.10156,-13.054698 -1.84414,-31.23888 2.23304,-59.5572 10.59961,-80.1093722 z M 124.09374,28.974692 h 15.5918 l -23.05273,98.572268 h -12.82227 l 6.54492,-28.375002 H 70.33399 L 43.13672,127.54696 H 28.625 Z m 37.38672,0.73437 c 0.21308,-0.005 0.42358,0 0.64063,0 h 42.08203 c 3.59706,0 6.37873,0.67583 8.35937,2.0293 1.96918,1.3614 2.70697,3.12139 2.24024,5.26367 l -5.01563,22.66016 h -14.83398 l 4.875,-22.05469 h -37.13867 l -13.41016,60.615246 -4.83789,21.947262 h 37.10156 l 0.0352,-0.14062 7.43555,-33.582048 h -17.43169 l 1.67188,-7.57617 c 0,-1.9e-4 32.26562,0 32.26562,0 0,-1.9e-4 -9.25,41.904308 -9.25,41.904308 -0.12531,0.59651 -0.34464,1.1367 -0.64062,1.67187 -0.76271,1.38867 -2.09186,2.57749 -3.94727,3.55665 -2.5726,1.35445 -5.65272,2.02734 -9.25,2.02734 h -42.04687 c -3.59707,0 -6.37854,-0.67289 -8.35938,-2.02734 -1.96917,-1.35467 -2.71834,-3.08386 -2.24023,-5.22852 l 18.5332,-83.773448 c 0.478,-2.14228 1.96887,-3.90423 4.55274,-5.26562 0.0912,-0.0491 0.19414,-0.059 0.28515,-0.10547 2.35854,-1.18135 5.12662,-1.8463 8.32422,-1.92188 z m 65.95117,0 h 52.9668 c 3.55155,0 6.34336,0.67583 8.32422,2.0293 1.99191,1.3614 2.75534,3.12139 2.27734,5.26367 l -9.88867,44.67969 c -0.46671,2.12865 -1.99448,3.86475 -4.58984,5.22852 -2.59535,1.368298 -5.64985,2.062498 -9.21289,2.062498 h -38.49024 l -7.43359,33.54493 -1.20899,5.51367 H 205.6621 l 1.10157,-4.97852 z m 73.17188,0 h 14.51367 l -16.43359,74.240248 -3.59375,16.2207 h 34.71875 c 0.36424,2.66244 0.79064,5.27746 1.24609,7.86133 h -52.2207 l 4.12695,-18.63867 z m -60.40039,7.89844 -9.64063,43.46875 h 36.17774 l 9.60351,-43.46875 z m -114.33203,2.125 c -4.50644,5.64804 -10.46897,12.35081 -17.88672,20.10547 L 80.0586,89.01961 h 32.73436 l 6.03906,-24.744138 c 2.43739,-9.81663 4.78408,-17.99843 7.03907,-24.54297 z m 37.1875,100.470708 c 0.14213,-0.005 0.28469,0 0.42773,0 1.68467,0 3.15613,0.29559 4.33985,0.85352 1.26365,0.59196 2.16721,1.47164 2.66796,2.63281 0.48948,1.12692 0.61722,2.40453 0.35547,3.80469 l -0.10742,0.53516 h -4.16211 c -1.9e-4,0 0.0371,-0.49805 0.0371,-0.49805 0.10763,-0.97836 -0.0153,-1.7483 -0.39258,-2.27734 -0.0492,-0.0662 -0.1203,-0.15333 -0.17773,-0.21289 -0.0938,-0.096 -0.23479,-0.20603 -0.35547,-0.28516 -0.58246,-0.36701 -1.49335,-0.56836 -2.66797,-0.56836 -1.55964,0 -2.72474,0.26997 -3.52148,0.81641 -0.77417,0.53499 -1.26455,1.13436 -1.42383,1.85156 -0.15945,0.72846 0.10291,1.10969 0.28515,1.31445 0.005,0.005 0.0285,0.0309 0.0352,0.0371 0.23069,0.19646 1.03138,0.65654 3.52148,1.24414 2.25387,0.54645 3.7474,1.03777 4.58985,1.45899 1.27491,0.64872 2.16609,1.48966 2.63281,2.52539 0.46673,1.02467 0.56792,2.22381 0.2832,3.52148 -0.2845,1.26366 -0.92856,2.42878 -1.88476,3.52149 -0.94471,1.09271 -2.14593,1.95711 -3.5918,2.56054 -1.43419,0.59195 -3.00858,0.92578 -4.625,0.92578 -2.04911,0 -3.69426,-0.31107 -4.98047,-0.92578 -1.34319,-0.63745 -2.31185,-1.64201 -2.88086,-2.95117 -0.54646,-1.27473 -0.66271,-2.72251 -0.35547,-4.30469 l 0.10547,-0.49804 h 4.0918 l -0.0352,0.49804 c -0.10244,0.94471 -0.002,1.70815 0.24805,2.27735 0.2392,0.54646 0.69535,0.9988 1.42383,1.35156 0.77417,0.37573 1.74151,0.56836 2.8457,0.56836 0.99042,0 1.89493,-0.16691 2.70313,-0.46289 0.79673,-0.28471 1.42952,-0.66048 1.88476,-1.13867 0.44398,-0.478 0.7046,-0.98303 0.81836,-1.5293 0.11388,-0.48948 0.086,-0.90266 -0.10742,-1.24414 -0.21625,-0.36423 -0.64472,-0.68791 -1.31641,-0.96094 0,-2.1e-4 -3.48437,-1.03125 -3.48437,-1.03125 -1.94643,-0.48947 -3.25684,-0.95711 -4.01953,-1.42383 -1.03593,-0.61452 -1.78272,-1.40293 -2.16992,-2.34765 -0.38699,-0.93345 -0.4282,-1.96683 -0.17774,-3.09375 0.26177,-1.20668 0.84278,-2.35445 1.74219,-3.37891 0.91069,-1.03593 2.08618,-1.8498 3.48633,-2.38477 1.23793,-0.46415 2.53986,-0.73517 3.91211,-0.78125 z m 37.35156,0.0703 c 0.22514,-0.0173 0.43679,0 0.67578,0 l 2.56055,0.28515 0.85351,0.0703 c 1.9e-4,0 -1.24414,3.16601 -1.24414,3.16601 l -0.24804,0.49805 -1.95704,-0.17774 c -0.57771,0 -1.00268,0.0897 -1.28125,0.28516 -0.0184,0.0139 -0.0533,0.0554 -0.0703,0.0703 -0.0374,0.0328 -0.10046,0.0899 -0.14258,0.14258 -0.17142,0.22457 -0.37947,0.62585 -0.5332,1.35156 0,0 -0.0743,0.30836 -0.14258,0.57032 h 3.0586 l -0.78321,3.52148 h -2.98633 c -0.22772,1.02444 -3.02539,13.55273 -3.02539,13.55273 h -4.125 c 0,0 2.68194,-12.03881 3.02344,-13.55273 h -2.38281 l 0.78125,-3.52148 h 2.34766 c 0.11369,-0.48948 0.28515,-1.10352 0.28515,-1.10352 0.25049,-1.13842 0.51203,-1.95618 0.85352,-2.52539 0.46692,-0.78546 1.12608,-1.44369 1.95703,-1.92188 0.68455,-0.39769 1.54981,-0.63496 2.52539,-0.71093 z m 9.85352,0.17773 c 0,0 -1.07853,4.85456 -1.35157,6.08399 h 2.66797 l -0.7832,3.52148 h -2.66797 c -0.21624,0.97874 -1.91992,8.57227 -1.91992,8.57227 0,0 -0.14258,0.91205 -0.14258,1.17382 2.1e-4,0.009 -7.8e-4,0.0288 0,0.0352 5.9e-4,0.003 -7.8e-4,0.033 0,0.0352 9.9e-4,0.002 0.0338,-0.001 0.0352,0 l 0.42773,0.0371 1.95508,-0.14258 -0.21289,3.16601 0.0351,0.56836 -2.81054,0.32031 c -1.11547,0 -1.93344,-0.18117 -2.52539,-0.56835 -0.62598,-0.40975 -0.98874,-0.95374 -1.13672,-1.63672 -0.0227,-0.12531 -0.0723,-0.30858 -0.0723,-0.57032 0,-0.51223 0.0975,-1.37821 0.42774,-2.88085 0,0 1.49377,-6.69794 1.8125,-8.10938 h -1.95508 l 0.78125,-3.52148 h 1.95703 c 0.18221,-0.81968 0.81836,-3.62891 0.81836,-3.62891 l 3.30859,-1.74414 z m -131.08398,0.14258 h 16.007801 l -0.89062,3.98437 H 82.59375 c -0.18209,0.80821 -0.91201,4.08171 -1.17383,5.26563 h 10.138671 l -0.888677,3.98242 H 80.53125 c -0.21629,0.99042 -2.16992,9.7832 -2.16992,9.7832 h -4.30469 z m 21.44921,5.62109 c 0.1606,-0.0198 0.33618,0 0.49805,0 1.02449,0 1.97022,0.31218 2.88086,0.96094 l 0.57031,0.39063 -2.20508,3.6289 -0.60547,-0.42773 c -0.44391,-0.28451 -0.92099,-0.42774 -1.42187,-0.42774 -0.432569,0 -0.836299,0.15472 -1.246099,0.42774 -0.43257,0.28471 -0.79325,0.66159 -1.0664,1.17383 -0.4781,0.87645 -0.82932,1.8593 -1.06836,2.91796 l -1.91993,8.75 h -4.126947 l 3.806637,-17.07421 h 3.8418 c 0,0 -0.13223,0.51744 -0.17773,0.71093 0.18217,-0.13657 0.37378,-0.32525 0.5332,-0.42773 0.55132,-0.32902 1.133269,-0.53328 1.707029,-0.60352 z m 12.23828,0 c 0.24845,-0.0189 0.49207,0 0.74609,0 2.32215,0 4.0788,0.81284 5.22852,2.41797 0.71714,1.03573 1.10352,2.31641 1.10352,3.8418 0,0.84225 -0.10398,1.75 -0.32032,2.74023 l -0.32031,1.24414 h -11.5957 c -0.0227,0.23901 -0.0371,0.49469 -0.0371,0.71094 0,0.88794 0.18334,1.58738 0.57031,2.09961 0.18393,0.25047 0.39746,0.47643 0.64063,0.64063 0.4585,0.29915 1.0494,0.46289 1.74218,0.46289 0.84232,0 1.58298,-0.23202 2.27735,-0.67579 0.6602,-0.42121 1.29181,-1.09584 1.84961,-2.02929 h 4.41015 l -0.39062,0.85351 c -0.84238,1.70762 -2.01793,3.03946 -3.48633,3.98438 -1.4684,0.94472 -3.22304,1.45898 -5.1582,1.45898 -2.51565,0 -4.38776,-0.81283 -5.54883,-2.41797 -1.14971,-1.57089 -1.39786,-3.74272 -0.78321,-6.47461 0.61477,-2.77757 1.84175,-4.99679 3.62891,-6.54492 1.60186,-1.38891 3.42026,-2.15975 5.44336,-2.3125 z m 18.5332,0 c 0.24829,-0.0189 0.49225,0 0.7461,0 2.32233,0 4.07881,0.81284 5.22851,2.41797 0.71718,1.03573 1.10352,2.31641 1.10352,3.8418 0,0.83097 -0.104,1.72417 -0.32031,2.70312 l -0.32032,1.28125 h -11.5957 c -0.0121,0.15945 -0.024,0.30362 -0.0352,0.46289 -0.009,0.0598 0.003,0.15004 0,0.21289 -3.3e-4,0.0104 0,0.0254 0,0.0352 0,0.17073 0.0238,0.33878 0.0352,0.49805 0.0568,0.64894 0.22587,1.19182 0.5332,1.60156 0.0586,0.0797 0.11344,0.17702 0.17774,0.24805 0.52136,0.55773 1.25884,0.85547 2.20508,0.85547 0.84238,0 1.59437,-0.23397 2.27734,-0.67774 0.66041,-0.42121 1.29186,-1.09389 1.84961,-2.02734 h 4.44531 l -0.42578,0.85351 c -0.84244,1.70763 -2.01791,3.03946 -3.48633,3.98438 -1.46842,0.94472 -3.22314,1.45898 -5.1582,1.45898 -2.51573,0 -4.38778,-0.81284 -5.54883,-2.41797 -0.75128,-1.02446 -1.10351,-2.33075 -1.10351,-3.8789 0,-0.23901 0.0118,-0.49562 0.0352,-0.7461 0.0456,-0.59175 0.13717,-1.1894 0.28516,-1.84961 0.61468,-2.7661 1.80659,-4.99678 3.59375,-6.54492 1.6018,-1.3889 3.45532,-2.15975 5.47851,-2.3125 z m 50.47657,0 c 0.25424,-0.0196 0.48709,0 0.74609,0 2.36782,0 4.18933,0.80044 5.37305,2.38282 1.17264,1.58218 1.45675,3.71598 0.85351,6.40234 -0.46672,2.09461 -1.14229,3.7862 -2.06445,5.01562 -0.92198,1.22941 -2.0955,2.235 -3.48438,2.91797 -1.37721,0.68297 -2.83626,1.03125 -4.30468,1.03125 -2.41334,0 -4.20992,-0.82431 -5.3711,-2.41797 -0.75122,-1.01317 -1.13867,-2.31927 -1.13867,-3.8789 0,-0.84224 0.0926,-1.73658 0.32031,-2.73828 0.68297,-3.05082 2.07609,-5.37407 4.125,-6.86524 1.50404,-1.0858 3.16587,-1.7129 4.94532,-1.84961 z m 62.50195,0 c 0.30014,-0.0186 0.57726,0 0.88867,0 1.4342,0 2.56034,0.14514 3.41406,0.49805 0.9107,0.36425 1.55764,0.87943 1.92188,1.49414 0.35296,0.58049 0.5332,1.29346 0.5332,2.16992 l -0.42773,2.59571 -0.78125,3.52148 c -0.67167,3.00511 -0.81928,4.13347 -0.85352,4.55469 -0.0341,0.5692 0.0183,1.12234 0.17774,1.63476 l 0.2832,0.92578 h -4.19727 l -0.17773,-0.5332 c -0.0683,-0.25029 -0.0476,-0.5688 -0.0703,-0.85351 -0.79693,0.48947 -1.5953,0.92354 -2.3125,1.17382 -1.05867,0.36444 -2.15777,0.56836 -3.27344,0.56836 -1.93494,0 -3.36723,-0.50392 -4.23242,-1.49414 -0.66001,-0.72848 -0.96094,-1.61963 -0.96094,-2.63281 0,-0.38699 0.0516,-0.78777 0.14258,-1.20898 0.1935,-0.86519 0.54579,-1.66562 1.10351,-2.38282 0.54645,-0.70572 1.19146,-1.28582 1.91993,-1.70703 0.70571,-0.4212 1.49282,-0.72081 2.3125,-0.92578 l 2.52539,-0.42578 c 1.94641,-0.22772 3.40006,-0.5109 4.44726,-0.81836 0.0227,-0.11369 0.0703,-0.25 0.0703,-0.25 0.165,-0.73244 0.14477,-1.28232 -0.0351,-1.56445 -0.0139,-0.0182 -0.0553,-0.0567 -0.0703,-0.0723 -0.0383,-0.0409 -0.0977,-0.10549 -0.14258,-0.14258 -0.42814,-0.33872 -1.15858,-0.49804 -2.13477,-0.49804 -1.10419,0 -1.92122,0.1822 -2.49023,0.53515 -0.55793,0.35277 -1.07386,0.99776 -1.5293,1.91992 h -4.30469 l 0.39063,-0.85351 c 0.51223,-1.18392 1.12403,-2.16479 1.88672,-2.91602 0.76271,-0.75122 1.79309,-1.3344 2.98828,-1.74414 0.91585,-0.30231 1.91634,-0.50228 2.98828,-0.56836 z m 18.03516,0 c 0.16067,-0.0198 0.33424,0 0.49609,0 1.03593,0 2.00729,0.31218 2.91797,0.96094 l 0.5332,0.39063 -2.20508,3.6289 -0.60547,-0.42773 c -0.44397,-0.28451 -0.89745,-0.42774 -1.38671,-0.42774 -0.4327,0 -0.86023,0.15472 -1.28125,0.42774 -0.4327,0.28471 -0.74675,0.66159 -1.03125,1.17383 -0.46674,0.87645 -0.82741,1.8593 -1.06641,2.91796 l -1.95703,8.75 h -4.12695 l 3.80664,-17.07421 h 3.84179 c 0,0 -0.097,0.51744 -0.14258,0.71093 0.18202,-0.13657 0.36442,-0.32525 0.53516,-0.42773 0.54249,-0.32902 1.09852,-0.53328 1.67188,-0.60352 z m 12.20117,0 c 0.24811,-0.0189 0.49225,0 0.74609,0 2.32234,0 4.09012,0.81284 5.22852,2.41797 0.72848,1.03573 1.10351,2.31641 1.10351,3.8418 0,0.84225 -0.1391,1.75 -0.35547,2.74023 l -0.28515,1.24414 h -11.59571 c -0.0227,0.23901 -0.0723,0.49469 -0.0723,0.71094 0,0.88794 0.19479,1.58738 0.57031,2.09961 0.0586,0.0797 0.14847,0.17702 0.21289,0.24805 0.0374,0.0397 0.10324,0.10549 0.14258,0.14258 0.50887,0.46258 1.20088,0.71289 2.0625,0.71289 0.84243,0 1.58308,-0.23202 2.27734,-0.67579 0.66041,-0.42121 1.28041,-1.09584 1.84961,-2.02929 h 4.44727 l -0.42774,0.85351 c -0.84243,1.70762 -2.02938,3.03946 -3.48632,3.98438 -1.47989,0.94472 -3.2116,1.45898 -5.15821,1.45898 -2.51563,0 -4.3527,-0.81283 -5.51367,-2.41797 -1.14968,-1.57089 -1.42159,-3.74271 -0.81836,-6.47461 0.61471,-2.77756 1.80659,-4.99678 3.59375,-6.54492 1.61187,-1.3889 3.45732,-2.15975 5.47852,-2.3125 z m -62.28906,0.32032 h 4.23437 c 0,0 0.52172,10.13129 0.5332,10.27929 0.17072,-0.36286 0.30351,-0.66761 0.32032,-0.71093 l 4.66015,-9.56836 h 3.87696 c 0,0 0.35546,10.00941 0.35546,10.0664 0.1137,-0.20478 5.30079,-10.0664 5.30078,-10.0664 h 4.19727 l -9.24805,17.07421 h -3.80664 c 0,0 -0.36787,-9.2595 -0.39062,-9.7832 -1.57091,3.22153 -4.76758,9.7832 -4.76758,9.7832 h -3.91406 z m -99.38868,3.23632 c -0.98056,0.0414 -1.87076,0.39412 -2.70312,1.06641 -0.6602,0.52371 -1.10613,1.24404 -1.45899,2.0293 0,2.1e-4 7.00782,0 7.00782,0 0.0121,-0.12497 0.0351,-0.27881 0.0351,-0.39258 0,-0.64893 -0.11541,-1.15265 -0.32031,-1.49414 -0.50079,-0.81948 -1.24345,-1.20899 -2.34766,-1.20899 -0.0662,0 -0.1475,-0.003 -0.21289,0 z m 18.53321,0 c -0.98054,0.0414 -1.87067,0.39412 -2.70313,1.06641 -0.66019,0.52371 -1.0947,1.24404 -1.45898,2.0293 0,2.1e-4 7.00781,0 7.00781,0 0.0121,-0.12497 0.0352,-0.27881 0.0352,-0.39258 0,-0.64893 -0.10402,-1.15265 -0.32032,-1.49414 -0.0995,-0.16639 -0.2338,-0.33055 -0.35547,-0.46094 -0.47543,-0.49105 -1.12957,-0.74805 -1.99218,-0.74805 -0.0662,0 -0.14743,-0.003 -0.21289,0 z m 143.35742,0 c -1.00842,0.031 -1.95031,0.37176 -2.81055,1.06641 -0.64874,0.52371 -1.09475,1.24404 -1.45898,2.0293 0,2.1e-4 6.97265,0 6.97265,0 0.0121,-0.12497 0.0352,-0.27881 0.0352,-0.39258 0,-0.64893 -0.10401,-1.15265 -0.32031,-1.49414 -0.48947,-0.80821 -1.24348,-1.19751 -2.34766,-1.20899 -0.0326,4e-4 -0.0379,-9.9e-4 -0.0703,0 z m -93.19922,0.0703 c -0.94098,0.11161 -1.81649,0.54188 -2.63281,1.28125 -0.97895,0.88794 -1.68987,2.28283 -2.09961,4.12695 -0.17072,0.77398 -0.24805,1.43557 -0.24805,2.02734 0,0.80821 0.1535,1.44193 0.46094,1.91992 0.0816,0.12288 0.19099,0.25414 0.28515,0.35743 0.5061,0.53734 1.21346,0.81836 2.09961,0.81836 1.1497,0 2.16143,-0.42847 3.12891,-1.31641 0.97894,-0.89922 1.67839,-2.30958 2.09961,-4.19922 0.38699,-1.73016 0.33355,-3.02211 -0.21289,-3.8418 -0.52352,-0.79672 -1.28916,-1.17382 -2.34766,-1.17382 -0.17963,0 -0.35889,-0.0208 -0.5332,0 z m 64.2793,6.22656 c -0.96747,0.26196 -2.05215,0.48208 -3.48633,0.67578 -1.06995,0.15928 -1.83339,0.32731 -2.27735,0.49805 -0.38699,0.15928 -0.69897,0.3798 -0.96093,0.67578 -0.25027,0.28451 -0.4183,0.58215 -0.49805,0.92383 -0.0227,0.13658 -0.0352,0.27881 -0.0352,0.39257 0,0.009 -2.1e-4,0.0262 0,0.0352 0.001,0.027 -0.003,0.0813 0,0.10742 0.007,0.0515 0.0212,0.12775 0.0352,0.17578 0.005,0.0156 0.0312,0.0569 0.0371,0.0723 0.0121,0.0307 0.0196,0.0784 0.0352,0.10742 0.0156,0.0288 0.0512,0.0778 0.0703,0.10547 0.0298,0.0409 0.0711,0.1041 0.10742,0.14258 0.28451,0.31873 0.85239,0.46289 1.67187,0.46289 0.89942,0 1.76362,-0.17202 2.56055,-0.57031 0.78547,-0.38718 1.42001,-0.96327 1.88672,-1.63477 0.3415,-0.478 0.61451,-1.21373 0.85352,-2.16992 z"></path></svg>
                <p id="gui-modal__controls"><span class="gui-modal__keybind">R</span> to RESET : : <span class="gui-modal__keybind gui-modal__keybindSPACE">SPACE</span> to SHAKE : : <span class="gui-modal__keybind">I</span> to TOGGLE INFO<br><i style="font-size: 1rem;">If you opened this with your mouse, click the screen after exiting this to enable the keys.</i></span></p>
                <div class="gui-modal__header"><a href="https://wavetro.net/support#wall" target="_blank" rel="noreferrer">SUPPORTERS</a></div>
                Uno Kl
                <br>Joober
                <br>StuntPlayZYT
                <br>laura
                <br>Watsugi Ishikura
		<br>Alleycat
                <br>GG
                <br>heccbro
                <br>Jambie
                <br><br>
                <div class="gui-modal__header"><a href="https://forum.babylonjs.com/" target="_blank" rel="noreferrer">FORUM LEGENDS</a></div>
                Evgeni_Popov
                <br>carolhmj
                <br>RaananW
                <br>bghgary
                <br>jeremy-coleman
                <br>labris
                <br>bigrig
                <br>sebavan
                <br>MackeyK24
                <br>jgonzosan
                <br>Blake
                <br><br>
                <a href="https://news.wavetro.net/" target="_blank" rel="noreferrer"><button>Follow for updates</button></a><a href="/"><button>Back to play.wavetro.net</button></a>
                <br><br>
                <i><p style="margin: -0.2rem 0 0.3rem 0;">2023-FEB-11</p></i>
                <i><b><a href="https://github.com/wavetro/testzone/tree/main/WTZ02 - House Shake" target="_blank" rel="noreferrer">BUILT</a> WITH <a href="https://babylonjs.com/" target="_blank" rel="noreferrer">BABYLON</a></b></i>
            </div>
        </div>
        <script>
        let scrollOnce = true;
        
        </script>
        `
    );

    // start at the bottom of the modal and scroll to the top to indicate its scrollability
    const guiModalQ: Element = document.querySelector('#gui-modal');
    guiModalQ.scrollTop = guiModalQ.scrollHeight;

    const guiModalScroll: any = () => {
        if (guiModalQ.scrollTop > 0 && scrollOnce) {
            guiModalQ.scrollTop -= 5;
            let scrolldelay = setTimeout(guiModalScroll, 1);
        } else {
            scrollOnce = false;
            guiModalQ.scrollTop = 0;
        }
    }
    
    guiModalScroll();

    // click anywhere BEHIND the modal to close the entire screen
    document.querySelector('#gui-modal').addEventListener("click", () => { // (are these anonymous functions memory-leaking from repeat resets too? idk!) ...
        modalClick = true;
        setTimeout(() => { modalClick = false; }, 100);
    });

    // (actual modal-closing happens here if not blocked by the previous EventListener)
    document.querySelector('.darkBGcentered').addEventListener("click", () => { // ... (it's not worth making named handler functions for such small things)
        if (menuOpen && !modalClick) {
            modalClose();
        }
    });

    menuOpen = true;
}

function modalClose() { // close our info modal
    document.querySelector('.darkBGcentered').remove(); // "why not just add a CSS rule to hide the HTML instead of deleting it?" oops! well it's too late now
    menuOpen = false;
}

async function resetScene01() { // delete and reset everything!
    resetting = true;
    camDistance = camD1;
    sfx = new Map();
    colliders = [];
    leftInside = ['table', 'chair.000', 'chair.001', 'picture', 'plate.000', 'plate.001', 'lamp']; 
    document.querySelector('.gui').remove();
    document.removeEventListener("keydown", IKeyHandler);
    if (menuOpen) { 
        modalClose(); 
        menuOpen = false;
    }

    await loadScene01();
    resetting = false;
}

///////////////////////////////////////
// API Checks
///////////////////////////////////////

// Let's check if we have WebGL and the Web Audio API first before running our app...

const testWebGL: WebGLRenderingContext = document.createElement('canvas').getContext('webgl');
let testAudio = true;

try {
    new AudioContext();
} 
catch(e) {
    testAudio = false;
}   

if (testWebGL) { // Let's say we have WebGL enabled...

    if (!testAudio) { // ...but not the Web Audio API

        document.querySelector('#p__compatCheck').innerHTML = `
            <span style="color: #FF3333;"><b>It seems like the Web Audio API is disabled in your browser. Please use a modern browser that has the API enabled (or with "play.wavetro.net" whitelisted) before continuing.</b> I don't track or fingerprint you with this API.</span>
        `

    } else { // ...AND the Web Audio API. We're all set!
    
        // Intro screen that enables audio once clicked
        document.querySelector('#intro').innerHTML = `
            <p id="p__code">WTZ02</p>
            <h1>House Shake</h1>
            <h2>🏠</h2>
            <div class="insertButton"></div>
        `

        // insert our button that launches Babylon.js
        const launchButton: HTMLButtonElement = document.createElement("button");
        launchButton.id = "button__GO";
        launchButton.innerText = "LAUNCH >>";
        launchButton.onclick = function() {
            document.querySelector('#intro').remove();
            App(); // start the app!
        };
        document.querySelector(".insertButton").appendChild(launchButton);
    }

} else {
    
    // no WebGL? no app
    document.querySelector('#p__compatCheck').innerHTML = `
        <span style="color: #FF3333;"><b>WebGL failed to load. Please use a modern browser that supports it before continuing.</b><br><br><em>(Advanced users: If you disabled WebGL in your browser config, please enable it and use <a href="https://noscript.net/" target="_blank" rel="noreferrer" style="color: #FF3333;">NoScript</a> instead. It will let you whitelist "play.wavetro.net" while still blocking other WebGL websites via custom trust levels. I don't track or fingerprint you with this API.)</em></span>
    `

}
