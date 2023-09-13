import * as CANNON from "cannon-es";
import {World} from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {fitnessData, PopulationManager} from "./PopulationManager";
import {Groups} from "../Utils/Groups";
import {Mesh, Object3D} from "three";
import * as THREE from "three";
import {createRandomCar} from "../VehicleModel/VehicleGeneration";

type Track = {
    /**
     * All physical bodies of the track pieces in linear order.
     */
    trackPieces: CANNON.Body[];

    /**
     * All Meshes of the track pieces in linear order.
     */
    threeJSTrackPieces: Mesh[];

    /**
     * The position of the finish.
     */
    finishPosition: CANNON.Vec3;

    /**
     * The lowest point of the track.
     */
    negativeYBorder: number;

    /**
     * Describes the track width.
     */
    trackWidth: number;
}

export type wheel = {
    radius: number,
    width: number,
    density: number,
    stiffness: number,
    posX: number,
    posY: number,
    posZ: number,
    canSteer: boolean,
}

/**
 * Type which uniquely describes a vehicle also referred to as the genome of a vehicle. Vehicles with the same genome
 * are perfect copies of each other.
 */
export type vehicleGenome = {
    bodyVectors: CANNON.Vec3[],
    wheels: wheel[],
}

/**
 * Extends the existing CANNON.World class to make interaction between Three and Cannon easier.
 */
export class ExtendedWorld extends World {
    populationManager: PopulationManager;
    leadingCar: ExtendedRigidVehicle;
    cameraFocus: Mesh = new Mesh();
    cannonDebugRenderer: any;
    groundMaterial: CANNON.Material = new CANNON.Material('groundMaterial');
    wheelMaterialFriction: CANNON.Material = new CANNON.Material('friction');
    bodyMaterial: CANNON.Material = new CANNON.Material('bodyMaterial');
    carIdCounter: number = 0;
    id: number;
    track: Track = {
        trackPieces: [],
        negativeYBorder: 0,
        threeJSTrackPieces: [],
        trackWidth: 0,
        finishPosition: new CANNON.Vec3(0, 0, 0)
    };
    render: boolean = false;
    disabled: boolean = false;
    useRealisticWheels: boolean;

    /**
     *
     * @param scene
     * @param options
     * @param gravity
     * @param groundBodyContactMaterialOptions
     * @param useRealisticWheels
     * @param id
     * @param population
     * @param populationManager
     * @param render
     */
    constructor(
        scene: THREE.Scene | undefined,
        options: any,
        gravity: number[],
        groundBodyContactMaterialOptions: any,
        useRealisticWheels: boolean,
        id: number,
        population: vehicleGenome[],
        populationManager: PopulationManager,
        render: boolean
    ) {
        super(options);
        this.id = id;
        this.carIdCounter = id * populationManager.batchSize;
        this.populationManager = populationManager;
        this.render = render;
        this.useRealisticWheels = useRealisticWheels;

        this.broadphase = new CANNON.SAPBroadphase(this);
        this.gravity.set(gravity[0], gravity[1], gravity[2]);

        scene?.add(this.cameraFocus);

        this.initCarGroundContact(
            groundBodyContactMaterialOptions
        );
        this.initPopulation(population, scene);

        this.leadingCar = new ExtendedRigidVehicle({
            bodyVectors: [],
            wheels: []
        }, undefined, undefined, useRealisticWheels, undefined, -1);
        this.leadingCar.chassisBody.position.set(-1, 0, 0);

        //Uncomment to enable debugging.
        if (scene) {
            //this.cannonDebugRenderer = CannonDebugger(scene, this);
        }

    }

    /**
     * Create the vehicles according to the passed vehicleGens. If the populationSize is larger than the amount of
     * vehicleGens, then fill the slots with random vehicles. Otherwise the population has been decreased and
     * from the passed vehicleGens only the amount of the new PopulationSize are added.
     */
    initPopulation(population: vehicleGenome[], scene: THREE.Scene | undefined) {
        if ((this.populationManager.batchSize - population.length) >= 0) { // Population got increased by the user.

            population.map((vehicleGenome) => {
                this.addCar(vehicleGenome, scene);
            });

            for (let i = 0; i < this.populationManager.batchSize - population.length; i++) {
                this.addCar(createRandomCar(), scene);
            }
        } else { //Population got decreased by the user.
            //TODO decrease population correctly
            for (let j = 0; j < this.populationManager.batchSize; j++) {
                this.addCar(population[j], scene);
            }
        }
    }

    /**
     * Add a single vehicle to the world according to its passed genome.
     * @param vehicleGenome which details the vehicle.
     * @param scene
     */
    addCar(vehicleGenome: vehicleGenome, scene: THREE.Scene | undefined) {
        try {
            let vehicle = new ExtendedRigidVehicle(
                vehicleGenome,
                this.bodyMaterial,
                this.wheelMaterialFriction,
                this.useRealisticWheels,
                this.render ? scene : undefined,
                this.carIdCounter++
            );

            this.populationManager.addCar(vehicle);
            vehicle.addToWorld(this);
        } catch (e) {
            this.populationManager.fitnessData.push(
                {
                    oldVehicleGen: vehicleGenome,
                    distanceTraveled: 0,
                    hasFinished: false,
                    timeInSteps: 0,
                    fitness: 0,
                }
            );
        }
    }

    /**
     * Add multiple vehicles to the world according to their genome.
     * @param vehicleGenomes An array of the vehicles to be added.
     */
    addCars(vehicleGenomes: vehicleGenome[]) {
        vehicleGenomes.forEach(vehicleGenome => {
            let vehicle = new ExtendedRigidVehicle(
                vehicleGenome,
                this.bodyMaterial,
                this.wheelMaterialFriction,
                this.useRealisticWheels,
                undefined,
                this.carIdCounter++
            );

            this.populationManager.addCar(vehicle);
            vehicle.addToWorld(this);
        })
    }

    /**
     * Calculate a step inside the physicsengine and update the visuals for the cars accordingly.
     * FrameTime and the timeOut are passed as arguments to allow dynamic changes to these values.
     * @param frameTime specifies the amount of steps per second.
     * @param timeOut the max amout of timeOut a car can have.
     */
    extendedStep(frameTime: number, timeOut: number) {
        //world.step(frameTime, delta, 1);
        this.step(frameTime);

        if (this.render) {

            //Update leading car.
            if (!this.populationManager.activeCars.has(this.leadingCar.id)) {
                if (this.populationManager.activeCars.size > 0) {
                    this.leadingCar.chassisBody.position.set(-1, 0, 0);
                } else {
                    this.disabled = true;
                    return;
                }
            }

            //Update position of cars inside the scene.
            this.populationManager.activeCars.forEach((car) => {
                this.advanceTimeout(car, timeOut);
                if (!car.updateSteeringAndApplyPower(this.track.trackWidth)) {
                    //takes care of cars that bug out
                    car.furthestPosition = new CANNON.Vec3(0,0,0);
                    this.removeVehicle(car);
                }
                this.updateScene(car);
            });

            //Update the camera position.
            let leadingPos = this.leadingCar.chassisBody.position;
            this.cameraFocus.position.set(leadingPos.x, leadingPos.y, leadingPos.z);

        } else {

            //Update only the cars physical body.
            this.populationManager.activeCars.forEach((car) => {
                this.advanceTimeout(car, timeOut);
                if (!car.updateSteeringAndApplyPower(this.track.trackWidth)) {
                    //takes care of cars that bug out
                    car.furthestPosition = new CANNON.Vec3(0,0,0);
                    this.removeVehicle(car);
                }
            });

            if (this.populationManager.activeCars.size === 0) {
                this.disabled = true;
            }
        }
    }

    /**
     * Updates the position of the correspoding visualdBody of the passed car.
     *
     * @param car which will be rendered in the scene.
     */
    updateScene(car: ExtendedRigidVehicle) {
        const posBody = car.chassisBody.position;
        const quatBody = car.chassisBody.quaternion;

        //Updating the leading car is only needed, if the worlds is being rendered.
        if (this.leadingCar.chassisBody.position.x < car.chassisBody.position.x) {
            this.leadingCar = car;
        }

        car.visualBody.position.set(posBody.x, posBody.y, posBody.z);
        car.visualBody.quaternion.set(quatBody.x, quatBody.y, quatBody.z, quatBody.w);

        for (let i = 0; i < car.wheelBodies.length; i++) {
            const posWheel = car.wheelBodies[i].position;
            const quatWheel = car.wheelBodies[i].quaternion;
            car.wheelMeshes[i].position.set(posWheel.x, posWheel.y, posWheel.z);
            car.wheelMeshes[i].quaternion.set(quatWheel.x, quatWheel.y, quatWheel.z, quatWheel.w);
        }
    }

    /**
     * Updates the timeout of a car during the simulation.
     *
     * @param car which timeOut to calculate.
     * @param timeOut the max amout of timeOut a car can have.
     */
    advanceTimeout(car: ExtendedRigidVehicle, timeOut: number) {
        if (car.advanceTimeoutAndPosition(timeOut, this.track.negativeYBorder, this.track.finishPosition.x)) {
            this.removeVehicle(car);
        }
    }

    /**
     * Removes a vehicle from this world and disables it in the populationManager.
     * @param vehicle to be removed.
     */
    removeVehicle(vehicle: ExtendedRigidVehicle) {
        if (this.populationManager.disableCar(vehicle, this.stepnumber, this.track.finishPosition.x)) {
            vehicle.removeFromWorld(this);
        }
    }

    /**
     * Add the friction properties for the body-ground as well as the wheel-ground contact to the world.
     * @param bodyGroundOptions options detailing the body-ground contact.
     */
    initCarGroundContact(bodyGroundOptions: any) {
        this.defaultContactMaterial.friction = 1;

        let wheelGroundOptions = {
            friction: 1,
            restitution: 0.1,
            contactEquationRelaxation: 1,
            frictionEquationStiffness: 10000000
        };

        let wheelGroundContactMaterialFriction = new CANNON.ContactMaterial(
            this.wheelMaterialFriction,
            this.groundMaterial,
            wheelGroundOptions
        );

        let bodyGroundContactMaterial = new CANNON.ContactMaterial(
            this.bodyMaterial,
            this.groundMaterial,
            bodyGroundOptions
        );

        this.addContactMaterial(wheelGroundContactMaterialFriction);
        this.addContactMaterial(bodyGroundContactMaterial);
    }

    /**
     * Create a simplified track with the given gradients. These determine the angle of the trackpieces in linear order.
     * So the first entry in the array defines the gradient of the first track piece.
     * This is considerably faster than using a HeightField and alowws the user to easily create tracks themselves but
     * also simplifies the track to a 2-dimensional plane. The gradients have to be between -90 and 90 degrees.
     * @param gradients which detail the track.
     * @param length of each track piece.
     * @param width
     * @param trackTexture defines the visual representation of the track.
     * @param scene
     */
    initTrackWithGradients(gradients: number[], length: number, width: number, trackTexture: THREE.MeshStandardMaterial | undefined, scene) {
        length = length/2;
        this.track.trackWidth = width / 2;
        let trackThickness = 1

        let rotateParallelToZAxis: CANNON.Quaternion;

        let trackPieceShape = new CANNON.Box(new CANNON.Vec3(length + 0.1, trackThickness, this.track.trackWidth));
        let lowestTrackPoint: number = 0;

        //The Track always starts on a 10m * width plane to allow the cars to spawn correctly
        let trackStart = new CANNON.Body({
            mass: 0, // mass = 0 makes the body static
            material: this.groundMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(10, trackThickness, this.track.trackWidth)),
            collisionFilterGroup: Groups.GROUP2,
            collisionFilterMask: Groups.GROUP1
        });

        this.addBody(trackStart);
        this.track.trackPieces.push(trackStart);

        if (this.render) {
            let geometry = new THREE.BoxGeometry(10 * 2, trackThickness * 2, this.track.trackWidth * 2); // double chasis shape
            let trackStartVisual;
            if (trackTexture) {
                trackStartVisual = new THREE.Mesh(geometry, trackTexture);
            } else {
                trackStartVisual = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
                    color: 	"#696969"
                }))
            }

            this.copyPosition(trackStart, trackStartVisual);

            this.track.threeJSTrackPieces.push(trackStartVisual);
            scene.add(trackStartVisual);
        }

        //the track always starts 10 Meters in front of the cars
        let currentPosition: CANNON.Vec3 = new CANNON.Vec3(10, 0, 0);

        //Construct the track by placing the track pieces at the correct positions according to the gradients
        gradients.forEach((gradient) => {
            //Calculate new Position via sum of interior angles, law of sin and law of cos

            //Law of Sin - calculate the distance (y-distance) to the middle of the to be placed track piece
            let yDist =
                (Math.sin((gradient * Math.PI) / 180)) * length / Math.sin((90 * Math.PI) / 180);

            //Law of Cos - calculate the distance (x-distance) to the middle of the to be placed track piece
            let xDist = Math.sqrt(
                 length * length - yDist * yDist
            );

            //adjust displacement for larger gradients
            if (90 < gradient || gradient < -90) {
                xDist = -xDist;
            }

            //Point to the placement (middle) of the current track piece
            currentPosition.x = currentPosition.x + xDist;
            currentPosition.y = currentPosition.y + yDist;

            let trackPiece = new CANNON.Body({
                mass: 0,
                position: currentPosition,
                collisionFilterGroup: Groups.GROUP3,
                collisionFilterMask: Groups.GROUP1
            });

            //Point to the end of the current track piece
            currentPosition.x = currentPosition.x + xDist;
            currentPosition.y = currentPosition.y + yDist;

            //update the lowest point if neccessary
            lowestTrackPoint =
                currentPosition.y < lowestTrackPoint ? currentPosition.y : lowestTrackPoint;

            //rotate the actual track piece according to the gradient
            rotateParallelToZAxis = new CANNON.Quaternion().setFromEuler(
                0,
                0,
                (gradient * 2 * Math.PI) / 360
            );

            trackPiece.addShape(trackPieceShape, new CANNON.Vec3(), rotateParallelToZAxis);
            this.addBody(trackPiece);
            this.track.trackPieces.push(trackPiece);

            //Add visual Body
            if (this.render) {

                let geometry = new THREE.BoxGeometry(length * 2, trackThickness * 2, this.track.trackWidth * 2); // double chasis shape
                let trackVisual;
                if (trackTexture) {
                    trackVisual = new THREE.Mesh(geometry, trackTexture);
                } else {
                    trackVisual = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
                        color: 	"#696969"
                    }))
                }

                const posBody = trackPiece.position;
                trackVisual.position.set(posBody.x, posBody.y, posBody.z);
                trackVisual.rotateZ((gradient * 2 * Math.PI) / 360);

                this.track.threeJSTrackPieces.push(trackVisual);
                scene.add(trackVisual);
            }

        });
        this.track.finishPosition = currentPosition;
        this.track.negativeYBorder = lowestTrackPoint - 10;
    }

    copyPosition(cannonBody: CANNON.Body, threeMesh: THREE.Mesh) {
        const posBody = cannonBody.position;
        const quatBody = cannonBody.quaternion;
        threeMesh.position.set(posBody.x, posBody.y, posBody.z);
        threeMesh.quaternion.set(quatBody.x, quatBody.y, quatBody.z, quatBody.w);
    }

    /**
     * @return if the world is active.
     */
    isActive(): boolean {
        return !this.disabled;
    }

    /**
     * Removes the soon-to-be old THREE.Meshes of each vehicle.
     */
    finishCurrentGen() {
        //Disable all cars first in case the simulation was prematurely stopped.
        this.populationManager.activeCars.forEach(vehicle => {
            this.removeVehicle(vehicle);
        })
    }
}