import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import audiofile from '/tap.mp3'

/* Actual HTML 
*/
const test = document.createElement('canvas').getContext('webgl');
if (!test) {
    document.querySelector('#app').innerHTML = `
        Please enable WebGL or add play.wavetro.net to your WebGL whitelist. Please also make sure you're using a browser that can load WebGL.
    `
} else {
    document.querySelector('#app').innerHTML = `
        <canvas class="webgl"></canvas>
    `
}

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Objects + Material + Skybox
 */
const dcolor = 0x724114
const pcolor = 0xffffff
const scolor = 0x000000
const material1 = new THREE.MeshPhongMaterial()
const material2 = new THREE.MeshPhongMaterial()
material1.color = new THREE.Color(dcolor) // set color
material2.color = new THREE.Color(pcolor)

const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.2, 32, 64),
    material1
)

const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.5, 0.05, 64, 1),
    material2
)

const platerim = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.025, 64, 64),
    material2
)

const platebump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.05, 64, 1),
    material2
)

scene.add(torus, plate, platerim, platebump)

torus.rotation.x = Math.PI/2
plate.position.y = -0.2
platerim.rotation.x = Math.PI/2
platerim.position.y = -0.15
platebump.position.y = -0.19

/**
 * Lights
 */
 const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
 scene.add(ambientLight)
 
 const pointLight = new THREE.PointLight(0xffffff, 0.4)
 pointLight.position.x = -2
 pointLight.position.y = 3
 pointLight.position.z = 2
 scene.add(pointLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 1
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

/**
 * Debug
 */

const pane = new Pane(); // Tweakpane: HEAVY but pretty

const PARAMS = { // set up your values in a hashtable (name not important)
    dcolor: dcolor,
    pcolor: pcolor,
    scolor: scolor
  };

const blade01 = pane.addInput( // and add em in!!!
    PARAMS, 'dcolor', {view: 'color', label: 'Flavor'}
).on('change', function(ev) {material1.color = new THREE.Color(ev.value)});

const blade02 = pane.addInput( // and add em in!!!
    PARAMS, 'pcolor', {view: 'color', label: 'Plate'}
).on('change', function(ev) {material2.color = new THREE.Color(ev.value)});

const blade03 = pane.addInput( // and add em in!!!
    PARAMS, 'scolor', {view: 'color', label: 'Background'}
).on('change', function(ev) {renderer.setClearColor(ev.value, 1)});

const blade04 = pane.addButton({
    title: 'Fucking annoying',
    label: '👺'
  });
  
blade04.on('click', () => {
    var audio = new Audio(audiofile)
    audio.play()
});