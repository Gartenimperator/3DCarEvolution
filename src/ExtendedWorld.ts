import * as CANNON from "cannon-es";
import {World} from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {PopulationManager} from "./PopulationManager";
import {Groups} from "./Groups";

type Track = {
    /**
     * All track pieces in linear order.
     */
    trackPieces: CANNON.Body[];

    /**
     * The lowest point of the track.
     */
    negativeYBorder: number;
}

export type wheel = {
    radius: number,
    width: number,
    posX: number,
    posY: number,
    posZ: number,
}

export type vehicleGenome = {
    baseWeight: number,
    length: number,
    height: number,
    width: number,
    wheels: wheel[],
}

//Extends the existing CANNON.World class to make interaction between Three and Cannon easier.
export class ExtendedWorld extends World {
    scene: any;
    populationManager: PopulationManager;
    cannonDebugRenderer: any;
    groundMaterial: CANNON.Material = new CANNON.Material('groundMaterial');
    wheelMaterial: CANNON.Material = new CANNON.Material('wheelMaterial');
    bodyMaterial: CANNON.Material = new CANNON.Material('bodyMaterial');
    carIdCounter: number = 0;
    id: number;
    track: Track = {
        trackPieces: [],
        negativeYBorder: 0,
    };
    render: boolean = true;

    constructor(
        scene: any,
        options: any,
        gravity: number,
        groundBodyContactMaterialOptions: any,
        groundWheelContactMaterialOptions: any,
        populationSize: number,
        id: number
    ) {
        super(options);
        this.id = id;
        this.populationManager = new PopulationManager();
        this.scene = scene;
        this.gravity.set(0, gravity, 0);

        this.initCarGroundContact(
            groundBodyContactMaterialOptions,
            groundWheelContactMaterialOptions
        );

        this.initNewPopulation(populationSize);

        //Can be removed if debugging is unnecessary.
        this.cannonDebugRenderer = CannonDebugger(this.scene, this);
    }

    //Add new Cars according to the given populationSize.
    initNewPopulation(populationSize: number) {
        for (var j = 0; j < populationSize; j++) {
            this.addCar(this.populationManager.getRandomCar());
        }
    }

    //Add a single car according to its passed genome.
    addCar(vehicleGenome: vehicleGenome) {

        let vehicle = new ExtendedRigidVehicle(
            vehicleGenome.length,
            vehicleGenome.height,
            vehicleGenome.width,
            this.bodyMaterial,
            this.carIdCounter++
        );

        //Add the visual body to the scene.
        this.scene.add(vehicle.carVisualBody);

        //Add wheels to the car.
        for (var i = 0; i < vehicleGenome.wheels.length; i++) {
            var radius = vehicleGenome.wheels[i].radius;
            console.log(radius);
            var width = vehicleGenome.wheels[i].width;

            vehicle.addWheelWithMesh(
                radius,
                width,
                vehicleGenome.wheels[i].posX, //length - x
                vehicleGenome.wheels[i].posY, //height - y
                vehicleGenome.wheels[i].posZ, //width - z
                this.scene,
                this.wheelMaterial
            );
        }

        //TODO How to handle 'incorrect' wheels
        // fe wheels that would spawn too far away from the car

        this.populationManager.addCar(vehicle);
        vehicle.addToWorld(this);
    }

    /**
     * Calculate a step inside the physicsengine and update the visuals for the cars accordingly.
     * FrameTime and the timeOut are passed as arguments to allow dynamic changes to these values.
     */
    updatePhysicsAndScene(frameTime: number, timeOut: number) {
        //world.step(frameTime, delta, 1);
        this.step(frameTime);

        //update position of cars inside the scene.
        this.populationManager.activeCars.forEach((car) => {
            const posBody = car.chassisBody.position;
            const quatBody = car.chassisBody.quaternion;

            //A car needs to move 1 meter during the timeOut duration to not get timed-out.
            if (posBody.x <= car.furthestPosition.x + 1) {
                car.timeOut = car.timeOut + 1;
                //Remove a car if it hasn't moved forward during the timeOut duration.
                if (car.timeOut > timeOut) {
                    this.removeVehicle(car);
                }
            } else {
                car.furthestPosition.set(posBody.x, posBody.y, posBody.z);
                car.timeOut = 0;
            }

            //Also remove a car if it has fallen off the track.
            if (posBody.y <= this.track.negativeYBorder) {
                this.removeVehicle(car);
            }

            //Update the visual representation of the car if this world is being rendered.
            if (this.render) {
                car.carVisualBody.position.set(posBody.x, posBody.y, posBody.z);
                car.carVisualBody.quaternion.set(quatBody.x, quatBody.y, quatBody.z, quatBody.w);
                for (var i = 0; i < car.wheelBodies.length; i++) {
                    const posWheel = car.wheelBodies[i].position;
                    const quatWheel = car.wheelBodies[i].quaternion;
                    car.wheelMeshes[i].position.set(posWheel.x, posWheel.y, posWheel.z);
                    car.wheelMeshes[i].quaternion.set(quatWheel.x, quatWheel.y, quatWheel.z, quatWheel.w);
                }
            }
        });
    }

    //Removes the given vehicle from this world and disables it in the populationManager.
    removeVehicle(vehicle: ExtendedRigidVehicle) {
        if (this.populationManager.disableCar(vehicle)) {
            vehicle.removeFromWorld(this);
            console.log(
                'Disabling vehicle ' +
                vehicle.id +
                ' from world ' +
                this.id +
                '. It traveled ' +
                vehicle.furthestPosition.x +
                ' meters.'
            );
        }
    }

    //Add the friction properties for the body-ground as well as the wheel-ground contact to the world.
    initCarGroundContact(bodyGroundOptiones: any, wheelGroundOptions: any) {
        this.broadphase = new CANNON.SAPBroadphase(this);
        this.defaultContactMaterial.friction = 1;
        var wheelGroundContactMaterial = new CANNON.ContactMaterial(
            this.wheelMaterial,
            this.groundMaterial,
            wheelGroundOptions
        );

        var bodyGroundContactMaterial = new CANNON.ContactMaterial(
            this.bodyMaterial,
            this.groundMaterial,
            bodyGroundOptiones
        );

        this.addContactMaterial(wheelGroundContactMaterial);
        this.addContactMaterial(bodyGroundContactMaterial);
    }

    //Creates a HeightField track with the given matrix. This approach causes the world to be very slow.
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
     */
    initTrackWithGradients(gradients: number[], length: number) {
        var rotateParallelToZAxis: CANNON.Quaternion;

        var trackPieceShape = new CANNON.Box(new CANNON.Vec3(length, 0.1, 50));
        var lowestTrackPoint: number = 0;

        //The Track always starts on a 10m * 50m plane to allow the cars to spawn correctly
        var planeBody = new CANNON.Body({
            mass: 0, // mass = 0 makes the body static
            material: this.groundMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(10, 0.1, 50)),
            collisionFilterGroup: Groups.GROUP2,
            collisionFilterMask: Groups.GROUP1
        });

        this.addBody(planeBody);
        this.track.trackPieces.push(planeBody);

        //the always track starts 10 Meters in front of the cars
        var currentPosition: CANNON.Vec3 = new CANNON.Vec3(10, 0, 0);

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

            //Point to the placement (middle) of the neto be placed track piece
            currentPosition.x = currentPosition.x + xDist;
            currentPosition.y = currentPosition.y + yDist;

            var box = new CANNON.Body({
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
            box.addShape(trackPieceShape, new CANNON.Vec3(), rotateParallelToZAxis);
            this.addBody(box);
            this.track.trackPieces.push(box);
        });
        this.track.negativeYBorder = lowestTrackPoint - 10;
        console.log(this.track.negativeYBorder);
    }
}