import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import {ExtendedWorld, vehicleGenome} from "./ExtendedWorld";
import {Material} from "three";

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
var camera: THREE.PerspectiveCamera, renderer: any;

let scene = new THREE.Scene();

// for more Info why the fakeCamera: https://stackoverflow.com/questions/53292145/forcing-orbitcontrols-to-navigate-around-a-moving-object-almost-working/53298655#53298655
var fakeCamera: THREE.PerspectiveCamera;

var controls: OrbitControls;
var materialDynamic, materialStatic;

// Physics variables

var activeWorlds: Map<number, ExtendedWorld> = new Map();
var worlds: ExtendedWorld[] = [];
var inactiveWorlds: Map<number, ExtendedWorld> = new Map();
var groundBodyContactMaterialOptions = {
    friction: 0.9,
    restitution: 0.3,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8
};
var worldOptions = {
    allowSleep: true,
    quatNormalizeFast: false,
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
    0, 15, 10, 0, 10, 0, 10, -30, -30, -30, -20, -10, 0, 10, 20, -90, 0, 80, -10, -10, -20, 0, 30,
    20, 10, 0];

var trackGradients: number[] = jump;
var trackPieceLengthX = 5;
const textureLoader = new THREE.TextureLoader();
let trackTexture: THREE.MeshStandardMaterial;

//Generic-Algorithm global variables
var population: number = 50;
var amountOfWorlds: number = 1;

var mutationRate = 0.01;

var timeOut: number = 360;

/**
 * Controller variables
 */

let startNextGen = false;
let simulateThisGeneration = true;

/**
 * Input listeners
 */

function startSimulation(population: vehicleGenome[] | undefined) {

    startNextGen = false;
    simulateThisGeneration = true;
    document.getElementById ("stopBtn").disabled = false;
    document.getElementById ("continueBtn").disabled = true;
    document.getElementById ("nextGenerationBtn").disabled = true;

    initGraphics();
    initWorlds(population);
}

function startNextGeneration() {
    startNextGen = true;
    document.getElementById ("stopBtn").disabled = true;
    document.getElementById ("continueBtn").disabled = true;
    document.getElementById ("nextGenerationBtn").disabled = true;
}

function stopSimulation() {
    simulateThisGeneration = false;
    document.getElementById ("stopBtn").disabled = true;
    document.getElementById ("continueBtn").disabled = false;
    document.getElementById ("nextGenerationBtn").disabled = false;
}

function continueSimulation() {
    simulateThisGeneration = true;
    startNextGen = false;
    document.getElementById ("stopBtn").disabled = false;
    document.getElementById ("continueBtn").disabled = true;
    document.getElementById ("nextGenerationBtn").disabled = true;
}

document.getElementById ("nextGenerationBtn").addEventListener ("click", startNextGeneration);

document.getElementById ("stopBtn").addEventListener ("click", stopSimulation);

document.getElementById ("continueBtn").addEventListener ("click", continueSimulation);

document.getElementById ("startSimulationBtn").addEventListener ("click", startSimulation);
document.getElementById ("stopBtn").disabled = false;
document.getElementById ("continueBtn").disabled = true;
document.getElementById ("nextGenerationBtn").disabled = true;




/**
 * Init Functions
 */

function initGraphics() {

    scene = new THREE.Scene();

    container = document.getElementById('simulationWindow');

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.x = -40;
    camera.position.y = 40;
    camera.position.z = 0;
    camera.lookAt(new THREE.Vector3(0, 3, 0));

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 0.80, window.innerHeight * 0.80);

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(20, 20, 5);
    scene.add(dirLight);

    materialDynamic = new THREE.MeshPhongMaterial({color: 0xfca400});
    materialStatic = new THREE.MeshPhongMaterial({color: 0x999999});

    if (container !== null) {
        container.innerHTML = '';

        //See link at the top, as to why I do this
        fakeCamera = camera.clone();
        controls = new OrbitControls(fakeCamera, renderer.domElement);

        stats = Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        container.appendChild(stats.domElement);

        container.appendChild(renderer.domElement);
    }

    const trackAsphaltTexture = textureLoader.load('./src/static/cardboard-texture.jpg');
    trackAsphaltTexture.wrapS = THREE.RepeatWrapping;
    trackAsphaltTexture.wrapT = THREE.RepeatWrapping;
    trackAsphaltTexture.repeat = new THREE.Vector2(5,5);
    trackTexture = new THREE.MeshStandardMaterial(
        {
            map: trackAsphaltTexture
        }
    )
}

/**
 * Initializes the worlds at the start of the genetic algorithm
 */
function initWorlds(currentPopulation: vehicleGenome[] | undefined) {
    removeOldWorlds();
    for (var i = 0; i < amountOfWorlds; i++) {
        var world = new ExtendedWorld(
            scene,
            worldOptions,
            gravity,
            groundBodyContactMaterialOptions,
            population,
            i,
            currentPopulation
        );

        //world.initTrackWithHeightfield(matrix);
        world.initTrackWithGradients(trackGradients, trackPieceLengthX, trackTexture);
        activeWorlds.set(world.id, world);
        worlds.push(world);
    }

    //prepare world to render
    worlds[0].cameraFocus.add(camera);
}

/**
 * Clean Up
 */

function removeOldWorlds() {
    //Clean up worlds.
    worlds.forEach(world => {
        //Call these functions again to update the scene, which will then display nothing.
        world.cleanUpCurrentGeneration(true);
    });

    while (worlds.length) {
        worlds.pop();
    }

    activeWorlds.clear();
    inactiveWorlds.clear();
}

/**
 * Main
 **/

/**
 * Calculates one step for each active CANNON-world while updating the THREE visual accordingly.
 */
function updatePhysics() {
    activeWorlds.forEach((world) => {
        //only update worlds with active cars
        if (world.isActive()) {

            world.updatePhysicsAndScene(frameTime, timeOut);

            //uncomment to view debug mode
            world.cannonDebugRenderer.update();
        } else {
            console.log('Disabling world with id: ' + world.id);
            inactiveWorlds.set(world.id, world);
            activeWorlds.delete(world.id);

            if (activeWorlds.size === 0) {
                document.getElementById ("stopBtn").disabled = true;
                document.getElementById ("continueBtn").disabled = true;
                document.getElementById ("nextGenerationBtn").disabled = false;
            }
        }
    });
}

/**
 * Looping function which syncs the Three.scene and ExtendendWorld after each calculation step.
 */
function render() {
    if (activeWorlds.size > 0 && simulateThisGeneration) {

        camera.copy(fakeCamera);
        requestAnimationFrame(render);

        updatePhysics();

        renderer.render(scene, camera);
        stats.update();
    } else {
        //set scene to loading

        if (startNextGen) {

            worlds.forEach(world => {
                world.cleanUpCurrentGeneration(true);

                let fitnessData = world.populationManager.createNextGeneration();
                startSimulation(fitnessData.map(fitnessData => fitnessData.vehicleGen));
                requestAnimationFrame(render);
            })
        } else {

            //The user can still move the camera around even if the cars are all disabled.
            camera.copy(fakeCamera);
            requestAnimationFrame(render);

            renderer.render(scene, camera);
            stats.update();
        }
    }
}

/**
 * main
 */

initGraphics();
initWorlds();
render();
