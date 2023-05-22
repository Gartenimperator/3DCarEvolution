import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import {ExtendedWorld} from "./World/ExtendedWorld";
import {WorldManager} from "./WorldManager";
import {RainBowColor} from "./Utils/ColorCoder";

let stats: any;

// Graphics variables
let container: HTMLElement | null;
let camera: THREE.PerspectiveCamera, renderer: any;

let scene = new THREE.Scene();

// for more Info on why the fakeCamera: https://stackoverflow.com/questions/53292145/forcing-orbitcontrols-to-navigate-around-a-moving-object-almost-working/53298655#53298655
let fakeCamera: THREE.PerspectiveCamera;

let controls: OrbitControls;
let materialDynamic, materialStatic;

// Physics variables
let currentWorld: ExtendedWorld;
let groundBodyContactMaterialOptions = {
    friction: 0.8,
    restitution: 0.3,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8
};
let worldOptions = {
    allowSleep: true,
    quatNormalizeFast: false,
    quatNormalizeSkip: 1
};
let gravity: number[] = [0, -9.82, 0];
const frameTime: number = 1 / 60;
const fastForwardFrameTime: number = 1 / 20;
const delta: number = 1; //???

//Track gradient arrays
let steps: number[] = [
    -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0,
    0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90,
    -90, 0, 0, -90
];
let nowWorking: number[] = [0, 10, 0, 0, 45, -45, -90, 180, -90, 0, 0, 0, 0, -110, -45, 0, -30, -20, 0, 10, 10];
let tumble: number[] = [-30, -30, -30, -30, -30, -30, -30, -30, -90, -90, -90, -90, -90, -90, -90, 0, 0, 0, 90, 90, 90, 90, -30, -30, -30, -30];
let simpleTrack: number[] = [
    0, 15, 10, 0, 10, 0, 10, 0, 30,20,10,0,20,30, 40, 40, 30, 20,-20,0,20,30,40,0,0,10,30,40,50,40,30, -30, -30, -30, -20, -10, 0, 10, 20,30,-90,-90,0,0,0,90,90,0,0,0];

/**
 * Include hurdles. May be spheres placed into the track. cylinder or convexCustomShape better?
 * CHeck for performance issues -> limit hurdles? how to regulate placement of hurdles?
 */

let trackGradients: number[] = simpleTrack;
let trackPieceLength = 5;
let trackPieceWidth = 100;
const textureLoader = new THREE.TextureLoader();
let trackTexture: THREE.MeshStandardMaterial;

//Genetic-Algorithm global variables
let amountOfWorlds: number = 1;

let batchSize: number = 40;
let amountOfBatches: number = 5;

let mutationRate = 0.05;

let timeOut: number = 300;

let currentGen = 0;

/**
 * Controller variables
 */

let simulateThisGeneration = true;
let isPaused = false;
let fastForwardCounter: number = 0;
let fastForward: boolean = false;

/**
 * WorldManager
 */

let worldManager: WorldManager = new WorldManager(amountOfWorlds, batchSize, amountOfBatches);

/**
 * Utils Function
 */

//TODO Use bootstrap for inputs?

//HTML References
let nextGenBtn = document.getElementById('nextGenerationBtn');
let stopBtn = document.getElementById("stopBtn");
let continueBtn = document.getElementById("continueBtn");
let newPopulationBtn = document.getElementById("startSimulationBtn");
let updateVariablesBtn = document.getElementById('updateVariables');
let fastForwardInput = document.getElementById('fastForward');
let fastForwardBtn = document.getElementById('fastForwardBtn');
let autoRunCheckbox = document.getElementById('autoRunCheckbox');
let gravityInput = document.getElementById('gravity');
let gravityInputError = document.getElementById('gravityInputError');
let batchSizeInput = document.getElementById('batchSize');
let batchSizeInputError = document.getElementById('batchSizeInputError');
let amountOfBatchesInput = document.getElementById('amountOfBatches');
let amountOfBatchesInputError = document.getElementById('amountOfBatchesInputError');
let timeoutInput = document.getElementById('timeout');
let timeoutInputError = document.getElementById('timeoutInputError');
let mutationRateInput = document.getElementById('mutationRate');
let mutationRateInputError = document.getElementById('mutationRateInputError');
let trackInput = document.getElementById('trackGradients');
let trackInputError = document.getElementById('trackGradientsInputError');
let trackPieceLengthXInput = document.getElementById('trackPieceLengthX');
let trackPieceLengthXInputError = document.getElementById('trackPieceLengthXInputError');
let variablesInputConfirmation = document.getElementById('variablesInputConfirmation');


let infoText = document.getElementById('currentBatchInfo');

/**
 * Input listeners
 */

function updateButtons(disableStopBtn: boolean, disableContinueBtn: boolean, disableNewPopulationBtn: boolean, disableNextGenBtn: boolean, disableFFBtn: boolean) {
    stopBtn.disabled = disableStopBtn;
    continueBtn.disabled = disableContinueBtn;
    newPopulationBtn.disabled = disableNewPopulationBtn;
    nextGenBtn.disabled = disableNextGenBtn;
    fastForwardBtn.disabled = disableFFBtn;
}

function next() {
    initGraphics();
    currentWorld = worldManager.next(scene, worldOptions, gravity, groundBodyContactMaterialOptions, false);
    currentWorld.initTrackWithGradients(trackGradients, trackPieceLength, trackPieceWidth, trackTexture, scene);
    currentWorld.cameraFocus.add(camera);
}

function updateInfoText() {
    infoText.innerHTML = 'Generation ' + worldManager.currentGen + '. Currently simulating batch ' + (1 + worldManager.currentBatch) + ' of world ' + worldManager.worldCounter + '.' +
        '\n Populationsize: ' + (worldManager.batchSize * (worldManager.batchAmount + 1));
    fastForwardInput.value = fastForwardCounter;
}

function resetInputFields() {
    updateInfoText();
    hideErrorMsgs();
    gravityInput.value = gravity;
    batchSizeInput.value = batchSize;
    amountOfBatchesInput.value = amountOfBatches;
    timeoutInput.value = timeOut;
    mutationRateInput.value = mutationRate;
    trackInput.value = trackGradients;
    trackPieceLengthXInput.value = trackPieceLength;
    variablesInputConfirmation.hidden = true;
    autoRunCheckbox.disabled = false;
}

function hideErrorMsgs() {
    batchSizeInputError.hidden = true;
    amountOfBatchesInputError.hidden = true;
    gravityInputError.hidden = true;
    timeoutInputError.hidden = true;
    mutationRateInputError.hidden = true;
    trackInputError.hidden = true;
    trackPieceLengthXInputError.hidden = true;
}

function startSimulation() {
    simulateThisGeneration = true;
    updateButtons(false, true, false, true, false);

    next();
    resetInputFields();
}

function restartSimulation() {
    simulateThisGeneration = true;
    updateButtons(false, true, false, true, false);
    worldManager.reset(batchSize, amountOfBatches);

    next();
    resetInputFields();
}

function stopSimulation() {
    simulateThisGeneration = false;
    isPaused = true;
    updateButtons(true, false, false, false, false);
}

function continueSimulation() {
    simulateThisGeneration = true;
    updateButtons(false, true, false, true, false);
}

// custom round function
function roundToFive(num: number) {
    return +(Math.round(num * 100000) / 100000);
}

function fastForwardFct() {
    let amount = parseInt(fastForwardInput.value);
    if (amount > 0) {
        updateButtons(true, true, true, true, true);
        fastForwardCounter = amount;
        autoRunCheckbox.checked = true;
        autoRunCheckbox.disabled = true;
        simulateThisGeneration = true;
    }
}

function updateVariables() {
    let canUpdate = true;

    let newGravity = gravityInput.value.split(',');
    if (!(newGravity.length === 3)) {
        canUpdate = false;
        gravityInputError.hidden = false;
    } else {
        newGravity.forEach((input, i) => {
            let vectorInput = parseFloat(input);
            if (!(vectorInput >= -100 && vectorInput <= 100)) {
                canUpdate = false;
                gravityInputError.hidden = false;
            } else {
                newGravity[i] = roundToFive(vectorInput);
            }
        })
    }

    let newTrackGradients = trackInput.value.split(',');
    newTrackGradients.forEach((input, i) => {
        let vectorInput = parseInt(input);
        if (!(vectorInput >= -180 && vectorInput <= 180)) {
            canUpdate = false;
            trackInputError.hidden = false;
        } else {
            newTrackGradients[i] = vectorInput;
        }
    })

    let newTrackPieceLength = parseFloat(trackPieceLengthXInput.value);
    if (!(newTrackPieceLength > 0)) {
        canUpdate = false;
        trackPieceLengthXInputError.hidden = false;
    }

    let newBatchSize = parseInt(batchSizeInput.value);
    if (!(newBatchSize > 0)) {
        canUpdate = false;
        batchSizeInputError.hidden = false;
    }

    let newAmountOfBatches = parseInt(amountOfBatchesInput.value);
    if (!(newAmountOfBatches > 0)) {
        canUpdate = false;
        amountOfBatchesInputError.hidden = false;
    }

    let newTimeout = parseInt(timeoutInput.value);
    if (!(newTimeout > 0)) {
        canUpdate = false;
        timeoutInputError.hidden = false;
    }

    let newMutationRate = parseFloat(mutationRateInput.value);
    if (newMutationRate > 1 && newMutationRate < 0) {
        canUpdate = false;
        mutationRateInputError.hidden = false;
    }

    if (canUpdate) {
        gravity = newGravity;
        batchSize = newBatchSize;
        amountOfBatches = newAmountOfBatches;
        timeOut = newTimeout;
        mutationRate = newMutationRate;
        trackGradients = newTrackGradients;
        trackPieceLength = newTrackPieceLength;
        variablesInputConfirmation.hidden = false;
        hideErrorMsgs();
    }
}

fastForwardBtn.addEventListener('click', fastForwardFct);
nextGenBtn.addEventListener("click", simulateNext);
stopBtn.addEventListener("click", stopSimulation);
continueBtn.addEventListener("click", continueSimulation);
newPopulationBtn.addEventListener("click", restartSimulation);
updateVariablesBtn.addEventListener('click', updateVariables);

/**
 * Init Functions
 */

function initGraphics() {

    renderer?.dispose();
    renderer?.forceContextLoss();

    scene = new THREE.Scene();

    container = document.getElementById('simulationWindow');

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.x = -60;
    camera.position.y = 60;
    camera.position.z = 0;
    camera.lookAt(new THREE.Vector3(0, 3, 0));

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 0.80, window.innerHeight * 0.80);

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    let dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(20, 20, 5);
    scene.add(dirLight);

    materialDynamic = new THREE.MeshPhongMaterial({color: 0xfca400});
    materialStatic = new THREE.MeshPhongMaterial({color: 0x999999});

    if (container) {
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
    trackAsphaltTexture.repeat = new THREE.Vector2(5, 5);
    trackTexture = new THREE.MeshStandardMaterial(
        {
            map: trackAsphaltTexture
        }
    )
}

function simulateNext() {
    next();

    //Only fastForward after the current Generation has finished.
    if (fastForwardCounter > 0) {
        fastForward = true;
        updateInfoText();
    } else {
        fastForward = false;
        simulateThisGeneration = true;
        updateButtons(false, true, false, true, false);
        resetInputFields();
    }
}

/**
 * Main
 **/

/**
 * Calculates one step the current World while updating the THREE visual accordingly.
 */
function updatePhysics() {
    currentWorld.extendedStep(frameTime, timeOut);
    //Update cannon debug renderer here for debug.
    if (!currentWorld.isActive()) {
        document.getElementById("stopBtn").disabled = true;
        document.getElementById("continueBtn").disabled = true;
        document.getElementById("nextGenerationBtn").disabled = false;
    }
}

/**
 * Looping function which syncs the Three.scene and ExtendendWorld after each calculation step.
 */
function render() {

    camera.copy(fakeCamera);
    requestAnimationFrame(render);
    renderer.render(scene, camera);

    if (fastForward && fastForwardCounter > 0) {
        while (currentWorld.isActive()) {
            updatePhysics();
        }
        fastForwardCounter--;
        simulateNext();
    } else {

        if (currentWorld.isActive() && simulateThisGeneration) {
            updatePhysics();
        } else if (autoRunCheckbox.checked && simulateThisGeneration) {
            simulateNext();
        }
        stats.update();
    }
}

/**
 * main
 */

for (var i = 0; i <= 100; i++) {
    let temp = document.createElement('span');
    temp.innerHTML = '&#9608;';
    temp.style.color = RainBowColor(i / 10, 10);
    document.getElementById('color').append(temp);
}

startSimulation();
render();
