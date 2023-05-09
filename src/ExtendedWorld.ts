import * as CANNON from "cannon-es";
import {World} from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {PopulationManager} from "./PopulationManager";
import {Groups} from "./Groups";
import {Mesh, Object3D, Scene} from "three";
import * as THREE from "three";

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
    density: number,
    radius: number,
    width: number,
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
    baseWeight: number,
    bodyVectors: CANNON.Vec3[],
    wheels: wheel[],
}

/**
 * Extends the existing CANNON.World class to make interaction between Three and Cannon easier.
 */
export class ExtendedWorld extends World {
    scene: Scene;
    populationManager: PopulationManager;
    cameraFocus: Mesh = new Mesh();
    cannonDebugRenderer: any;
    groundMaterial: CANNON.Material = new CANNON.Material('groundMaterial');
    wheelMaterialLowFriction: CANNON.Material = new CANNON.Material('lowFriction');
    wheelMaterialMediumFriction: CANNON.Material = new CANNON.Material('mediumFriction');
    wheelMaterialHighFriction: CANNON.Material = new CANNON.Material('highFriction');
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
    render: boolean = true;
    disabled: boolean = false;

    /**
     *
     * @param scene
     * @param options
     * @param gravity
     * @param groundBodyContactMaterialOptions
     * @param populationSize
     * @param id
     * @param population
     */
    constructor(
        scene: any,
        options: any,
        gravity: number[],
        groundBodyContactMaterialOptions: any,
        populationSize: number,
        id: number,
        population: vehicleGenome[]
    ) {
        super(options);
        this.id = id;
        this.populationManager = new PopulationManager(populationSize);
        this.scene = scene;

        this.broadphase = new CANNON.SAPBroadphase(this);
        this.gravity.set(gravity[0], gravity[1], gravity[2]);

        this.scene.add(this.cameraFocus);

        this.initCarGroundContact(
            groundBodyContactMaterialOptions
        );
        this.initPopulation(population);

        //Can be removed if debugging is unnecessary.
        this.cannonDebugRenderer = CannonDebugger(this.scene, this);
    }

    /**
     * Create the vehicles according to the passed vehicleGens. If the populationSize is larger than the amount of
     * vehicleGens, then fill the slots with random vehicles. Otherwise the population has been decreased and
     * from the passed vehicleGens only the amount of the new PopulationSize are added.
     */
    initPopulation(population: vehicleGenome[]) {
        if ((this.populationManager.populationSize - population.length) >= 0) { // Population got increased by the user.

            population.map((vehicleGenom) => {
                this.addCar(vehicleGenom);
            });

            for (let i = 0; i < this.populationManager.populationSize - population.length; i++) {
                this.addCar(this.createRandomCar());
            }
        } else { //Population got decreased by the user.
            //TODO decrease population correctly
            for (let j = 0; j < this.populationManager.populationSize; j++) {
                this.addCar(population[j]);
            }
        }
    }

    /**
     * Add a single vehicle to the world according to its passed genome.
     * @param vehicleGenome which details the vehicle.
     */
    addCar(vehicleGenome: vehicleGenome) {

        let vehicle = new ExtendedRigidVehicle(
            vehicleGenome,
            this.bodyMaterial,
            this.wheelMaterialHighFriction,
            this.scene,
            this.carIdCounter++
        );

        this.populationManager.addCar(vehicle);
        vehicle.addToWorld(this);
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
                this.wheelMaterialHighFriction,
                this.scene,
                this.carIdCounter++
            );

            this.populationManager.addCar(vehicle);
            vehicle.addToWorld(this);
        })
    }

    /**
     * Calculate a step inside the physicsengine and update the visuals for the cars accordingly.
     * FrameTime and the timeOut are passed as arguments to allow dynamic changes to these values.
     * @param frameTime specifies the amount of steps per frame.
     * @param timeOut the max amout of timeOut a car can have.
     */
    updatePhysicsAndScene(frameTime: number, timeOut: number) {
        //world.step(frameTime, delta, 1);
        this.step(frameTime);

        if (this.render) {

            //Update leading car.
            if (!this.populationManager.activeCars.has(this.populationManager.leadingCar.id)) {
                if (this.populationManager.activeCars.size > 0) {
                    this.populationManager.leadingCar.chassisBody.position.set(-1, 0, 0);
                } else {
                    this.disabled = true;
                    return;
                }
            }

            //Update position of cars inside the scene.
            this.populationManager.activeCars.forEach((car) => {
                this.advanceTimeout(car, timeOut);
                car.updateSteering(this.track.trackWidth);
                this.updateScene(car);
            });

            //Update the camera position.
            var leadingPos = this.populationManager.leadingCar.chassisBody.position;
            this.cameraFocus.position.set(leadingPos.x, leadingPos.y, leadingPos.z);

        } else {

            //Update only the cars physical body.
            this.populationManager.activeCars.forEach((car) => {
                this.advanceTimeout(car, timeOut);
                car.updateSteering(this.track.trackWidth);
            });

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
        if (this.populationManager.leadingCar.chassisBody.position.x < car.chassisBody.position.x) {
            this.populationManager.leadingCar = car;
        }

        car.visualBody.position.set(posBody.x, posBody.y, posBody.z);
        car.visualBody.quaternion.set(quatBody.x, quatBody.y, quatBody.z, quatBody.w);

        for (var i = 0; i < car.wheelBodies.length; i++) {
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
        if (this.populationManager.disableCar(vehicle, this.stepnumber)) {
            vehicle.removeFromWorld(this);
        }
    }

    /**
     * Add the friction properties for the body-ground as well as the wheel-ground contact to the world.
     * @param bodyGroundOptions options detailing the body-ground contact.
     */
    initCarGroundContact(bodyGroundOptions: any) {
        this.defaultContactMaterial.friction = 1;

        var wheelGroundOptions = {
            friction: 0.4,
            restitution: 0.3,
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e8
        };

        wheelGroundOptions.friction = 0.2;
        var wheelGroundContactMaterialLowFriction = new CANNON.ContactMaterial(
            this.wheelMaterialLowFriction,
            this.groundMaterial,
            wheelGroundOptions
        );

        wheelGroundOptions.friction = 0.5;
        var wheelGroundContactMaterialMediumFriction = new CANNON.ContactMaterial(
            this.wheelMaterialMediumFriction,
            this.groundMaterial,
            wheelGroundOptions
        );

        wheelGroundOptions.friction = 0.8;
        var wheelGroundContactMaterialHighFriction = new CANNON.ContactMaterial(
            this.wheelMaterialHighFriction,
            this.groundMaterial,
            wheelGroundOptions
        );

        var bodyGroundContactMaterial = new CANNON.ContactMaterial(
            this.bodyMaterial,
            this.groundMaterial,
            bodyGroundOptions
        );

        this.addContactMaterial(wheelGroundContactMaterialLowFriction);
        this.addContactMaterial(wheelGroundContactMaterialMediumFriction);
        this.addContactMaterial(wheelGroundContactMaterialHighFriction);
        this.addContactMaterial(bodyGroundContactMaterial);
    }

    /**
     * Creates a HeightField track with the given matrix. This approach causes the world to be very slow.
     * @param matrix which details the HeightField.
     */
    initTrackWithHeightfield(matrix: number[][]) {
        const heightfieldShape = new CANNON.Heightfield(matrix, {
            elementSize: 10
        });
        const heightfieldBody = new CANNON.Body({
            mass: 0,
            collisionFilterGroup: 2,
            collisionFilterMask: 1
        });
        heightfieldBody.addShape(heightfieldShape);
        heightfieldBody.position.set(
            -5,
            -2,
            ((matrix[0].length - 1) * heightfieldShape.elementSize) / 2
        );
        heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.addBody(heightfieldBody);
    }

    /**
     * Create a simplified track with the given gradients. These determine the angle of the trackpieces in linear order.
     * So the first entry in the array defines the gradient of the first track piece.
     * This is considerably faster than using a HeightField and alowws the user to easily create tracks themselves but
     * also simplifies the track to a 2-dimensional plane. The gradients have to be between -90 and 90 degrees.
     * @param gradients which detail the track.
     * @param length of each track piece.
     * @param trackTexture defines the visual representation of the track.
     */
    initTrackWithGradients(gradients: number[], length: number, trackTexture: THREE.MeshStandardMaterial) {

        //Remove the existing track
        this.track.trackPieces.forEach((trackPiece) => {
            this.removeBody(trackPiece);
        });

        var rotateParallelToZAxis: CANNON.Quaternion;

        var trackPieceShape = new CANNON.Box(new CANNON.Vec3(length, 1, 50));
        var lowestTrackPoint: number = 0;

        this.track.trackWidth = 50;

        //The Track always starts on a 10m * 50m plane to allow the cars to spawn correctly
        let trackStart = new CANNON.Body({
            mass: 0, // mass = 0 makes the body static
            material: this.groundMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(10, 1, 50)),
            collisionFilterGroup: Groups.GROUP2,
            collisionFilterMask: Groups.GROUP1
        });

        this.addBody(trackStart);
        this.track.trackPieces.push(trackStart);

        var geometry = new THREE.BoxGeometry(10 * 2, 1 * 2, 50 * 2); // double chasis shape
        let trackStartVisual = new THREE.Mesh(geometry, trackTexture);

        this.copyPosition(trackStart, trackStartVisual);

        this.track.threeJSTrackPieces.push(trackStartVisual);
        this.scene.add(trackStartVisual);

        //the track always starts 10 Meters in front of the cars
        let currentPosition: CANNON.Vec3 = new CANNON.Vec3(10, 0, 0);

        //Construct the track by placing the track pieces at the correct positions according to the gradients
        gradients.forEach((gradient) => {
            //Calculate new Position via sum of interior angles, law of sin and law of cos
            var beta: number = 90 - gradient;

            //Law of Sin - calculate the distance (y-distance) to the middle of the to be placed track piece
            var yDist =
                (Math.sin((gradient * Math.PI) / 180) * length) / Math.sin((90 * Math.PI) / 180);

            //Law of Cos - calculate the distance (x-distance) to the middle of the to be placed track piece
            var xDist = Math.sqrt(
                yDist * yDist - 2 * length * yDist * Math.cos((beta * Math.PI) / 180) + length * length
            );

            //adjust displacement for larger gradients
            if (90 < gradient || gradient < -90) {
                xDist = -xDist;
            }

            //Point to the placement (middle) of the current track piece
            currentPosition.x = currentPosition.x + xDist;
            currentPosition.y = currentPosition.y + yDist;

            var trackPiece = new CANNON.Body({
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

                var geometry = new THREE.BoxGeometry(length * 2, 1 * 2, 50 * 2); // double chasis shape
                let trackVisual = new THREE.Mesh(geometry, trackTexture);

                const posBody = trackPiece.position;
                trackVisual.position.set(posBody.x, posBody.y, posBody.z);
                trackVisual.rotateZ((gradient * 2 * Math.PI) / 360);

                this.track.threeJSTrackPieces.push(trackVisual);
                this.scene.add(trackVisual);
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
    cleanUpCurrentGeneration(removeTrack: boolean) {

        //Disable all cars first in case the simulation was prematurely stopped.
        this.populationManager.activeCars.forEach(vehicle => {
            this.removeVehicle(vehicle);
        })

        this.populationManager.disabledCars.forEach(vehicle => {
            vehicle.wheelMeshes.forEach(wheelMesh => {
                this.removeObjectFromScene(wheelMesh);
            })

            this.removeBody(vehicle.chassisBody);
            vehicle.wheelBodies.forEach(wheel => {
                this.removeBody(wheel);
            })

            this.removeObjectFromScene(vehicle.visualBody);
            this.removeObjectFromScene(vehicle.wheelMaterial);
            this.removeObjectFromScene(vehicle.wheelHoodMaterial);
            this.removeObjectFromScene(vehicle.bodyMaterial);
        })

        if (removeTrack) {
            this.removeTrack();
        }
    }

    /**
     * Removes the physical and visual bodies of the track.
     */
    removeTrack() {
        while (this.track.trackPieces.length) {
            this.removeBody(this.track.trackPieces.pop());
            this.removeObjectFromScene(this.track.threeJSTrackPieces.pop());
        }
    }

    /**
     * Removing an Object from the scene needs to be done correctly to avoid memory leaks, as
     * the render and the scene itself can store separate references.
     * @param object3D the object to be removed from the scene.
     */
    removeObjectFromScene(object3D) {
        if (!(object3D instanceof Object3D)) return false;

        // for better memory management and performance
        if (object3D.geometry) object3D.geometry.dispose();

        if (object3D.material) {
            if (object3D.material instanceof Array) {
                // for better memory management and performance
                object3D.material.forEach(material => material.dispose());
            } else {
                // for better memory management and performance
                object3D.material.dispose();
            }
        }
        object3D.removeFromParent(); // the parent might be the scene or another Object3D, but it is sure to be removed this way
        return true;
    }

    /**
     * Generates a new random vehicle. This vehicle hax a maximum length of 5 and a maximum width/height of 2 meters.
     * The amount, placement and size of wheels is also randomly generated. The wheel radius and width have a maximum size of 1 meter.
     * The wheel position is generated according to the size of the vehicle body, so that the wheels center has to always touch the body.
     */
    createRandomCar(): vehicleGenome {
        //GenerateRandomCar Here
        var vehicle: vehicleGenome = {
            baseWeight: 10 + this.roundToFour(Math.random() * 100), //base weigth - influences the cars calculated weight and its engine power
            bodyVectors: [],
            wheels: []
        };

        //Minimum 4 vectors.
        var bodyVectorAmount = 4 + Math.floor(Math.random() * 8);

        for (let i = 0; i < bodyVectorAmount; i++) {
            let x = this.roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6));
            let y = this.roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6));
            let z = this.roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6));
            vehicle.bodyVectors.push(new CANNON.Vec3(x, y, z));
        }

        var wheelAmount = Math.floor(Math.random() * 10);

        //TODO How to handle 'incorrect' wheels
        // fe wheels that would spawn too far away from the car
        for (let j = 0; j < wheelAmount; j++) {
            var wheel: wheel = {
                radius: (this.roundToFour(Math.max(1, Math.random() * 3))), //wheel radius [1.5, 3)
                width: (this.roundToFour(2.5 - Math.random())), //wheel width (1.5, 2.5]

                //Try to generate wheels which are touching the car
                posX: this.roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * 4), //wheel position lengthwise
                posY: this.roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * 4), //wheel position height
                posZ: this.roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * 4), //wheel position width


                density: Math.ceil(Math.random() * 10),
                canSteer: Math.floor(Math.random() * 2) === 1,
            };

            vehicle.wheels.push(wheel);
        }

        return vehicle;
    }

    // custom round function
    roundToFour(num: number) {
        return +(Math.round(num * 10000) / 10000);
    }
}