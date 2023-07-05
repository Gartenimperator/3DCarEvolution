import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import {ExtendedWorld, vehicleGenome} from "./World/ExtendedWorld";
import {WorldManager} from "./WorldManager";
import {RainBowColor} from "./Utils/ColorCoder";
import {vehGenConstants} from "./VehicleModel/VehicleGenerationConstants";

let stats: any;

// Graphics variables
let container: HTMLElement | null;
let camera: THREE.PerspectiveCamera, renderer: any;

let scene: any;

// for more Info on why the fakeCamera: https://stackoverflow.com/questions/53292145/forcing-orbitcontrols-to-navigate-around-a-moving-object-almost-working/53298655#53298655
let fakeCamera: THREE.PerspectiveCamera;

let controls: OrbitControls;
let materialDynamic, materialStatic;

// Physics variables
let currentWorld: ExtendedWorld;
let groundBodyContactMaterialOptions = {
    friction: 0.8,
    restitution: 0.1,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1000
};
let worldOptions = {
    allowSleep: true,
    quatNormalizeFast: false,
    quatNormalizeSkip: 0
};
let gravity: number[] = [0, -9.82, 0];
const frameTime: number = 1 / 60;

//Track gradient arrays
let steps: number[] = [
    -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0,
    0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90,
    -90, 0, 0, -90
];

let jump: number[] = [0,0,0,0,0,0,0,0,5,5,10,10,15,15,20,20,25,25,30,35,35,40,40,45,-90,-90,-90,-90,0,0,0,0,0,0,0,90,90,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

let nowWorking: number[] = [0, 10, 0, 0, 45, -45, -90, 180, -90, 0, 0, 0, 0, -110, -45, 0, -30, -20, 0, 10, 10];
let example: number[] = [0, 20, 90, 180, -90, -90, -150, 0, 0, 0];
let tumble: number[] = [-30, -30, -30, -30, -30, -30, -30, -30, -90, -90, -90, -90, -90, -90, -90, 0, 0, 0, 90, 90, 90, 90, -30, -30, -30, -30];
let simpleTrack: number[] = [0, 0, 0, 0, 15, 10, 0, 10, 0, 10, 0, 20, 20, 10, -20, 0, -30, 0, 10, 20, 30, 20, 30, 40, 30, 20, -20, 0, 20, 30, -40, 0, 0, 10, 30, 40, 50, 40, 30, 0, -20, -30, -30, -30, -20, -10, 0, 10, 20, 30, 40, 0, 0, 0, -12, -35, 0, 0, 0];
/**
 * Include hurdles. May be spheres placed into the track. cylinder or convexCustomShape better?
 * CHeck for performance issues -> limit hurdles? how to regulate placement of hurdles?
 */

let trackGradients: number[] = simpleTrack;
let trackPieceLength = 5;
let trackPieceWidth = 200;
const textureLoader = new THREE.TextureLoader();
let trackTexture: THREE.MeshStandardMaterial;

//Genetic-Algorithm global variables
let amountOfWorlds: number = 1;

let batchSize: number = 10;
let amountOfBatches: number = 1;

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

let userVehicle: vehicleGenome | undefined;

let vehicleInputExample: string = '0,0,0,5,0,0,5,0,2,0,0,2,2,4,1, 2, -4,1|2,1,1,0.5,4,-5,2,0,1,0.4,1,1,-3,-5,1,0,2,1,1,1,4,-5,-2,0,1,0.4,1,1,-3,-5,-1,0';

/**
 * WorldManager
 */

let worldManager: WorldManager = new WorldManager(amountOfWorlds, batchSize, amountOfBatches);

//TODO Use bootstrap for inputs?

//HTML References
let nextGenBtn = <HTMLButtonElement>document.getElementById('nextGenerationBtn')!;
let stopBtn = <HTMLButtonElement>document.getElementById("stopBtn")!;
let continueBtn = <HTMLButtonElement>document.getElementById("continueBtn")!;
let newPopulationBtn = <HTMLButtonElement>document.getElementById("startSimulationBtn")!;
let updateVariablesBtn = <HTMLButtonElement>document.getElementById('updateVariables')!;
let fastForwardInput = <HTMLInputElement>document.getElementById('fastForward')!;
let fastForwardBtn = <HTMLButtonElement>document.getElementById('fastForwardBtn')!;
let autoRunCheckbox = <HTMLInputElement>document.getElementById('autoRunCheckbox')!;
let realisticWheelsCheckbox = <HTMLInputElement>document.getElementById('realisticWheelsCheckbox')!;
let gravityInput = <HTMLInputElement>document.getElementById('gravity')!;
let gravityInputError = document.getElementById('gravityInputError')!;
let batchSizeInput = <HTMLInputElement>document.getElementById('batchSize')!;
let batchSizeInputError = document.getElementById('batchSizeInputError')!;
let amountOfBatchesInput = <HTMLInputElement>document.getElementById('amountOfBatches')!;
let amountOfBatchesInputError = document.getElementById('amountOfBatchesInputError')!;
let timeoutInput = <HTMLInputElement>document.getElementById('timeout')!;
let timeoutInputError = document.getElementById('timeoutInputError')!;
let mutationRateInput = <HTMLInputElement>document.getElementById('mutationRate')!;
let mutationRateInputError = document.getElementById('mutationRateInputError')!;
let trackInput = <HTMLInputElement>document.getElementById('trackGradients')!;
let trackInputError = document.getElementById('trackGradientsInputError')!;
let trackPieceLengthXInput = <HTMLInputElement>document.getElementById('trackPieceLengthX')!;
let trackPieceLengthXInputError = document.getElementById('trackPieceLengthXInputError')!;
let variablesInputConfirmation = document.getElementById('variablesInputConfirmation')!;
let vehicleInput = <HTMLInputElement>document.getElementById('vehicleInput')!;
let vehicleInputBtn = <HTMLButtonElement>document.getElementById('addVehicleBtn')!;
let vehicleInputConfirmation = document.getElementById('vehicleInputConfirmation')!;
let vehicleInputError = document.getElementById('vehicleInputError')!;

let printDataBtn = <HTMLButtonElement>document.getElementById('printDataBtn')!;

let infoText = document.getElementById('currentBatchInfo')!;

/**
 * Input listeners
 */

function updateButtons(disableStopBtn: boolean, disableContinueBtn: boolean, disableNewPopulationBtn: boolean, disableNextGenBtn: boolean, disableFFBtn: boolean, disableRealisticWheels: boolean) {
    stopBtn.disabled = disableStopBtn;
    continueBtn.disabled = disableContinueBtn;
    newPopulationBtn.disabled = disableNewPopulationBtn;
    nextGenBtn.disabled = disableNextGenBtn;
    fastForwardBtn.disabled = disableFFBtn;
    realisticWheelsCheckbox.disabled = disableRealisticWheels;
}

function next() {
    currentWorld?.cleanUpCurrentGeneration(true, scene);
    if (!fastForward) {
        initGraphics();
    }

    currentWorld = worldManager.next(scene, worldOptions, gravity, groundBodyContactMaterialOptions, fastForward, batchSize, amountOfBatches, mutationRate, !realisticWheelsCheckbox.checked, userVehicle);
    userVehicle = undefined;
    currentWorld.initTrackWithGradients(trackGradients, trackPieceLength, trackPieceWidth, trackTexture, scene);
    currentWorld.cameraFocus.add(camera);
}

function updateInfoText() {
    infoText.innerHTML = 'Generation ' + worldManager.currentGen + '. Currently simulating batch ' + (1 + worldManager.currentBatch) + ' of world ' + worldManager.worldCounter + '.' +
        '\n Populationsize: ' + (worldManager.batchSize * (worldManager.batchAmount + 1));
    fastForwardInput.value = String(fastForwardCounter);
}

function resetInputFields() {
    updateInfoText();
    hideErrorMsgs();
    gravityInput.value = gravity.toString();
    batchSizeInput.value = String(batchSize);
    amountOfBatchesInput.value = String(amountOfBatches);
    timeoutInput.value = String(timeOut);
    mutationRateInput.value = String(mutationRate);
    trackInput.value = trackGradients.toString();
    trackPieceLengthXInput.value = String(trackPieceLength);
    variablesInputConfirmation.hidden = true;
    vehicleInputConfirmation.hidden = true;
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
    updateButtons(false, true, false, true, false, false);

    next();
    resetInputFields();
}

function restartSimulation() {
    simulateThisGeneration = true;
    updateButtons(false, true, false, true, false, false);
    worldManager.reset(batchSize, amountOfBatches);

    next();
    resetInputFields();
}

function stopSimulation() {
    simulateThisGeneration = false;
    isPaused = true;
    updateButtons(true, false, false, false, false, false);
}

function continueSimulation() {
    simulateThisGeneration = true;
    updateButtons(false, true, false, true, false, false);
}

function simulateNext() {
    //Only fastForward after the current Generation has finished.
    if (fastForwardCounter > 0) {
        fastForward = true;
        updateInfoText();
    } else {
        fastForward = false;
        simulateThisGeneration = true;
        updateButtons(false, true, false, true, false, false);
        resetInputFields();
    }
    next();
}

// custom round function
function roundToFive(num: number) {
    return +(Math.round(num * 100000) / 100000);
}

function fastForwardFct() {
    let amount = parseInt(fastForwardInput.value);
    if (amount > 0) {
        updateButtons(true, true, true, true, true, true);
        fastForwardCounter = amount;
        autoRunCheckbox.checked = true;
        autoRunCheckbox.disabled = true;
        simulateThisGeneration = true;
    }
}

function parseInputVehicle() {
    let newGen: vehicleGenome = {
        bodyVectors: [],
        wheels: []
    };
    let input: String[] = vehicleInput.value.split('|');
    if (input.length === 2) {
        let bodyVectors = input[0].split(',');
        let wheelVectors = input[1].split(',');

        if (bodyVectors.length % 3 === 0 && bodyVectors.length >= 12) {
            for (let i = 0; i < bodyVectors.length; i += 3) {
                let x = parseFloat(bodyVectors[i]);
                let y = parseFloat(bodyVectors[i + 1]);
                let z = parseFloat(bodyVectors[i + 2]);

                if (-20 < x && 20 > x && -20 < y && 20 > y && -20 < z && 20 > z) {
                    newGen.bodyVectors.push(new CANNON.Vec3(x, y, z));
                } else {
                    vehicleInputError.hidden = false;
                    return;
                }
            }
        } else {
            vehicleInputError.hidden = false;
            return;
        }

        if (wheelVectors.length % 8 === 0 && wheelVectors.length >= 8) {
            for (let i = 0; i < wheelVectors.length; i += 8) {
                let wheelGen = {
                    radius: parseFloat(wheelVectors[i]),
                    width: parseFloat(wheelVectors[i + 1]),
                    density: parseFloat(wheelVectors[i + 2]),
                    stiffness: parseFloat(wheelVectors[i + 3]),
                    posX: parseFloat(wheelVectors[i + 4]),
                    posY: parseFloat(wheelVectors[i + 5]),
                    posZ: parseFloat(wheelVectors[i + 6]),
                    canSteer: parseInt(wheelVectors[i + 7]) === 1,
                };
                newGen.wheels.push(wheelGen);
            }
        } else {
            if (!(wheelVectors[0] == '')) {
                vehicleInputError.hidden = false;
                return;
            }
        }
        vehicleInputError.hidden = true;
        vehicleInputConfirmation.hidden = false;
        userVehicle = newGen;
    } else {
        vehicleInputError.hidden = false;
        return;
    }
}

function updateVariables() {
    let canUpdate = true;

    let newGravityString = gravityInput.value.split(',');
    let newGravity: number[] = [];
    if (!(newGravityString.length === 3)) {
        canUpdate = false;
        gravityInputError.hidden = false;
    } else {
        newGravityString.forEach((input, i) => {
            let vectorInput = parseFloat(input);
            if (!(vectorInput >= -100 && vectorInput <= 100)) {
                canUpdate = false;
                gravityInputError.hidden = false;
            } else {
                newGravity[i] = roundToFive(vectorInput);
            }
        })
    }

    let newTrackGradientString = trackInput.value.split(',');
    let newTrackGradients: number[] = [];
    newTrackGradientString.forEach((input, i) => {
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

function logData() {
    worldManager.dataStore.logData();
}

fastForwardBtn.addEventListener('click', fastForwardFct);
nextGenBtn.addEventListener("click", simulateNext);
stopBtn.addEventListener("click", stopSimulation);
continueBtn.addEventListener("click", continueSimulation);
newPopulationBtn.addEventListener("click", restartSimulation);
updateVariablesBtn.addEventListener('click', updateVariables);
vehicleInputBtn.addEventListener('click', parseInputVehicle);
printDataBtn.addEventListener('click', logData);

/**
 * Init Functions
 */

function initGraphics() {

    renderer?.dispose();
    scene?.clear();
    scene = new THREE.Scene();

    container = document.getElementById('simulationWindow');

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.x = -30;
    camera.position.y = 40;
    camera.position.z = 0;
    camera.lookAt(new THREE.Vector3(0, 3, 0));

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    let dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 20, 5);
    scene.add(dirLight);

    let dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(20, 20, 60);
    scene.add(dirLight2);
    let dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight3.position.set(20, 20, -60);
    scene.add(dirLight3);

    materialDynamic = new THREE.MeshPhongMaterial({color: 0xfca400});
    materialStatic = new THREE.MeshPhongMaterial({color: 0x999999});

    if (container) {
        container.innerHTML = '';

        //See link at the camera instiiation, as to why I do this
        fakeCamera = camera.clone();
        controls = new OrbitControls(fakeCamera, renderer.domElement);

        stats = Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '10px';
        stats.domElement.style.left = '10px';
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

/**
 * Main
 **/

/**
 * Calculates one step the current World while updating the THREE visual accordingly.
 */
function updatePhysics() {
    currentWorld.extendedStep(frameTime, timeOut);
    //Update cannon debug renderer here for debug.
    //currentWorld.cannonDebugRenderer.update();
    if (!currentWorld.isActive()) {
        let temp = <HTMLButtonElement>document.getElementById("stopBtn");
        temp.disabled = true;
        temp = <HTMLButtonElement>document.getElementById("continueBtn");
        temp.disabled = true;
        temp = <HTMLButtonElement>document.getElementById("nextGenerationBtn");
        temp.disabled = false;
    }
}

/**
 * Looping function which syncs the Three.scene and ExtendendWorld after each calculation step.
 */
function render() {

    if (fastForward && fastForwardCounter > 0) {
        while (currentWorld.isActive()) {
            updatePhysics();
        }
        fastForwardCounter--;
        setTimeout(function () {
            simulateNext();
            render();
        }, 5);
    } else {

        if (currentWorld.isActive() && simulateThisGeneration) {
            updatePhysics();
        } else if (autoRunCheckbox.checked && simulateThisGeneration) {
            simulateNext();
        }

        camera.copy(fakeCamera);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        stats.update();
    }
}

/**
 * main
 */
//jobs to be done once on Load.
for (var i = 0; i <= 50; i++) {
    let temp = document.createElement('span')!;
    temp.innerHTML = '&#9608;';
    temp.style.color = RainBowColor(vehGenConstants.minDensity + i / 50, vehGenConstants.maxDensity);
    document.getElementById('color')!.append(temp);
}

vehicleInput.value = vehicleInputExample;

startSimulation();
render();
