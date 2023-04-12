import type { Mesh } from 'three';

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import {ExtendedWorld} from "./ExtendedWorld";

// Detects webgl
/*
if ( ! Detector.webgl ) {
Detector.addGetWebGLMessage();
document.getElementById( 'container' ).innerHTML = "";
}
*/

var stats: any;

// Graphics variables
var container: HTMLElement | null;
var camera: any, scene: any, renderer: any;
var controls: OrbitControls;
var materialDynamic, materialStatic;
var XPointer: any;

// Physics variables

var activeWorlds: Map<number, ExtendedWorld> = new Map();
var inactiveWorlds: Map<number, ExtendedWorld> = new Map();
var groundBodyContactMaterialOptions = {
    friction: 0.9,
    restitution: 0.1,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8
};
var groundWheelContactMaterialOptions = {
    friction: 0.3,
    restitution: 0,
    frictionEquationStiffness: 1000
};
var worldOptions = {
    allowSleep: true,
    quatNormalizeFast: true,
    quatNormalizeSkip: 1
};
var gravity = -9.82;
const frameTime: number = 1 / 60;
const fastForwardFrameTime: number = 1 / 20;
const delta: number = 1; //???

//Track gradient arrays
var steps: number[] = [
    -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0,
    0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90,
    -90, 0, 0, -90
];
var nowWorking: number[] = [0, 10, 0, 0, 45, -45, -90, 180, -90, 0, 0, 0, 0, -110, -45, 0, -30, -20, 0, 10, 10];
var jump: number[] = [0, -10, 0, 10, 20, -90, -90, -90, 0, 70, 80, 90, -10, 0, 0, 90];
var simpleTrack: number[] = [
    0, 15, 34, 30, 30, 20, 10, -30, -30, -30, -20, -10, 0, 10, 20, -90, 0, 80, -10, -10, -20, 0, 30,
    20, 10, 0
];

var trackGradients: number[] = steps;
var trackPieceLengthX = 5;

//Generic-Algorithm global variables
var population: number = 2;
var amountOfWorlds: number = 1;

var timeOut: number = 420;

//Collision Groups
var GROUP1 = 1;
var GROUP2 = 2;
var GROUP3 = 4;

function initGraphics() {
    container = document.getElementById('simulationWindow');

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.x = -20;
    camera.position.y = 20;
    camera.position.z = 0;
    camera.lookAt(new THREE.Vector3(0, 3, 0));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 0.80, window.innerHeight * 0.80);

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 5);
    scene.add(dirLight);

    materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
    materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });

    if (container !== null) {
        container.innerHTML = '';
        controls = new OrbitControls(camera, renderer.domElement);

        stats = Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        container.appendChild(stats.domElement);

        container.appendChild(renderer.domElement);
    }

    var geometryX = new THREE.PlaneGeometry(40, 1, 1);
    var materialX = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
    });
    XPointer = new THREE.Mesh(geometryX, materialX);
    XPointer.rotation.x = Math.PI / 2;
    scene.add(XPointer);

    //window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);
}

/**
 * Initializes the worlds at the start of the genetic algorithm
 */
function initWorlds() {
    for (var i = 0; i < amountOfWorlds; i++) {
        var world = new ExtendedWorld(
            scene,
            worldOptions,
            gravity,
            groundBodyContactMaterialOptions,
            groundWheelContactMaterialOptions,
            population,
            i
        );
        //world.initTrackWithHeightfield(matrix);
        world.initTrackWithGradients(trackGradients, trackPieceLengthX);

        activeWorlds.set(world.id, world);
    }
    console.log(activeWorlds);
}

/**
 * Main
 **/

/**
 * Calculates one step for each active world.
 */
function updatePhysics() {
    // update the chassis position
    activeWorlds.forEach((world) => {
        //only update worlds with active cars
        if (world.populationManager.populationSize > 0) {
            world.updatePhysicsAndScene(frameTime, timeOut);

            //uncomment to view debug mode
            world.cannonDebugRenderer.update();
        } else {
            console.log('Disabling world with id: ' + world.id);
            inactiveWorlds.set(world.id, world);
            activeWorlds.delete(world.id);
        }
    });
}

/**
 * Looping function which syncs the Three.scene and ExtendendWorld after each calculation step.
 */
function render() {
    requestAnimationFrame(render);

    if (activeWorlds.size > 0) {
        updatePhysics();
    } else {
        //next steps in the generation
        //let render() run, allows the user to move around the map
    }

    renderer.render(scene, camera);
    stats.update();
}

/**
 * main
 */


initGraphics();
initWorlds();

render();