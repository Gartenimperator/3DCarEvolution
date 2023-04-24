import * as CANNON from "cannon-es";
import {RigidVehicle} from "cannon-es";
import * as THREE from "three";
import {Material, Mesh, Scene} from "three";
import {Groups} from "./Groups";
import {vehicleGenome} from "./ExtendedWorld";

/**
 * Extends the existing CANNON.RigidVehicle class to make interaction between Three and Cannon easier.
 * An ExtendedRigidVehicle also keeps track of its own furthest position and timeout value inside its assigned world.
 */
export class ExtendedRigidVehicle extends RigidVehicle {
    wheelMeshes: Mesh[] = [];
    visualBody: Mesh = new Mesh();
    furthestPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0);
    timeOut: number = 0;
    bodyMass: number = 0;
    vehicleMass: number = 0;
    id: number;
    wheelMaterial = new THREE.MeshLambertMaterial({
        color: 0x191919,
        transparent: true,
        opacity: 1.0
    });
    wheelHoodMaterial = new THREE.MeshPhongMaterial({
        color: 0xC0C0C0,
        transparent: true,
        opacity: 1.0
    });
    bodyMaterial = new THREE.MeshPhongMaterial({
        color: 'red',
        transparent: true,
        opacity: 1.0
    });
    vehicleGen: vehicleGenome;
    hasFinished: boolean = false;

    constructor(
        vehicleGen: vehicleGenome,
        physicalBodyMaterial: CANNON.Material | undefined,
        scene: Scene | undefined,
        id: number
    ) {
        super();
        this.vehicleGen = vehicleGen;
        this.id = id;
        this.addBody(physicalBodyMaterial, scene);
        this.addWheels(scene);
    }

    /**
     * Creates a vehicle body in CANNON according to the passed parameters and stores the fitting visual representation in this.visualBody.
     * @param scene which the wheels will be added to, if it exists.
     * @private
     */
    private addWheels(scene: THREE.Scene | undefined) {
        //Add wheels to the car.
        for (var i = 0; i < this.vehicleGen.wheels.length; i++) {

            this.addWheelWithMesh(
                this.vehicleGen.wheels[i].radius,
                this.vehicleGen.wheels[i].width,
                this.vehicleGen.wheels[i].posX, //length - x
                this.vehicleGen.wheels[i].posY, //height - y
                this.vehicleGen.wheels[i].posZ, //width - z
                this.vehicleGen.wheels[i].material,
                this.vehicleGen.wheels[i].canSteer,
                scene
            );
        }
    }

    /**
     * Creates the physical CANNON.Body and the corresponding visual representation in the THREE.scene.
     * @param bodyMaterial of the vehicle body. If it is undefined no body will be created.
     * @param scene the scene which renders the body. If it is undefined no THREE.Mesh will be created.
     */
    addBody(bodyMaterial: CANNON.Material | undefined, scene: Scene | undefined) {

        if (bodyMaterial == undefined) {
            return;
        }
        //Add physical Body
        var chassisShape = new CANNON.Box(new CANNON.Vec3(this.vehicleGen.length, this.vehicleGen.height, this.vehicleGen.width));

        //the bodyMass can't be lighter than 10 Kg
        this.bodyMass = Math.max(this.vehicleGen.length * this.vehicleGen.height * this.vehicleGen.width, 10);

        this.vehicleMass = this.vehicleMass + this.bodyMass;

        var chassisBody = new CANNON.Body({
            mass: this.bodyMass,
            position: new CANNON.Vec3(0, 10, 0), //cars spawn 10 meters in the air.
            material: bodyMaterial,
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3
        });
        chassisBody.addShape(chassisShape);
        this.chassisBody = chassisBody;

        //Add visual Body
        var geometry = new THREE.BoxGeometry(this.vehicleGen.length * 2, this.vehicleGen.height * 2, this.vehicleGen.width * 2); // double chasis shape

        //Add visual Body
        if (scene != undefined) {
            this.visualBody = new THREE.Mesh(geometry, this.bodyMaterial);
            scene.add(this.visualBody);
        }

    }

    /**
     * Creates a wheel with CANNON according to the passed parameters as well as the fitting visual representation in Three.
     * @param radius of the wheel.
     * @param width of the wheel.
     * @param positionX of the wheel.
     * @param positionY of the wheel.
     * @param positionZ of the wheel.
     * @param physicalWheelMaterial of the wheel. If the param is undefined no physical CANNON.Body will be created.
     * @param canSteer defines if the wheel is steerable or not.
     * @param scene the wheel is placed inside of. If the param is undefined no visual THREE.Mesh will be created.
     */
    addWheelWithMesh(
        radius: number,
        width: number,
        positionX: number,
        positionY: number,
        positionZ: number,
        physicalWheelMaterial: CANNON.Material | undefined,
        canSteer: boolean,
        scene: THREE.Scene | undefined
    ) {

        //Add wheel physical body
        if (physicalWheelMaterial != undefined) {
            this.addPhysicalWheel(radius, width, positionX, positionY, positionZ, physicalWheelMaterial, canSteer);
        }

        //Add wheel visual body
        if (scene != undefined) {
            this.addWheelMesh(radius, width, scene);
        }
    }

    /**
     * Adds a wheel according to the parameters.
     * @param radius of the wheel.
     * @param width of the wheel.
     * @param positionX of the wheel.
     * @param positionY of the wheel.
     * @param positionZ of the wheel.
     * @param physicalWheelMaterial of the wheel.
     * @param canSteer defines if the wheel is steerable or not.
     * @private
     */
    private addPhysicalWheel(radius: number,
                             width: number,
                             positionX: number,
                             positionY: number,
                             positionZ: number,
                             physicalWheelMaterial: CANNON.Material,
                             canSteer: boolean) {
        const wheelVolume = Math.PI * width * (radius * radius);
        const wheelMass = Math.max(1, wheelVolume * 3);

        let wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: physicalWheelMaterial,
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3
        });

        new THREE.Euler();

        const rotateParallelToXAxis = new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0);
        const shape = new CANNON.Cylinder(radius, radius, width, 25);
        wheelBody.addShape(shape, new CANNON.Vec3(), rotateParallelToXAxis);
        wheelBody.angularDamping = 0.6;

        this.addWheel({
            body: wheelBody,
            position: new CANNON.Vec3(positionX, positionY, positionZ),
            axis: new CANNON.Vec3(0, 0, -1)
        });

        this.vehicleMass = this.vehicleMass + wheelMass;

        let wheelForce = Math.max(5, Math.min(this.bodyMass * wheelMass, 1000));

        if (canSteer) {
            wheelForce = wheelForce * 2 / 3; //Steerable wheels get a small punishment by power reduction.
        }

        this.setWheelForce(
            Math.max(5, Math.min(this.bodyMass * wheelMass, 1000)),
            this.wheelBodies.length - 1
        );
    }

    /**
     * Helper method for adding wheels. Creates and adds the wheelMesh according to the given parameters.
     * @param radius of the wheel.
     * @param width of the wheel.
     * @param scene the wheel is added to.
     */
    addWheelMesh(radius: number, width: number, scene: THREE.Scene) {
        let wheelVisual = new THREE.CylinderGeometry(radius, radius, width, 26, 1);
        let wheelHood = new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, width * 1.1, 26, 1);
        wheelVisual.rotateZ(Math.PI / 2);
        wheelHood.rotateZ(Math.PI / 2);
        wheelVisual.rotateY(Math.PI / 2);
        wheelHood.rotateY(Math.PI / 2);
        var wheelMesh = new THREE.Mesh(wheelVisual, this.wheelMaterial);
        wheelMesh.add(new THREE.Mesh(wheelHood, this.wheelHoodMaterial));
        wheelMesh.add(new THREE.Mesh(new THREE.BoxGeometry(radius * 0.6, radius * 0.2, width * 1.2), this.wheelMaterial));
        scene.add(wheelMesh);
        this.wheelMeshes.push(wheelMesh);
    }

    /**
     * Updates the timeout of a car during the simulation and decides whever it should get disabled. This might be due
     * to falling off the track, finishing or simply being to slow.
     *
     * @param timeOut the max amount of timeOut a car can have.
     * @param yBorder describes the lowest point of the track.
     * @return true if and only if the car should be disabled.
     */
    advanceTimeoutAndPosition(timeOut: number, yBorder: number, finishLine: number): boolean {

        const posBody = this.chassisBody.position;

        //A car needs to move to the next 'full' meter during the timeOut duration to not get timed-out.
        if (posBody.x <= Math.ceil(this.furthestPosition.x)) {
            this.timeOut = this.timeOut + 1;

            //Return true if this car hasn't moved forward during the timeOut duration.
            if (this.timeOut > timeOut) {
                return true;
            }
        } else {
            this.timeOut = 0;
        }

        if (this.furthestPosition.x < posBody.x) {
            this.furthestPosition.set(posBody.x, posBody.y, posBody.z);
            if (this.furthestPosition.x >= finishLine) {
                this.hasFinished = true;
                //Return true if this car has fallen finished and should be disabled
                return true;
            }
        }

        //Return true if this car has fallen off the track and should be disabled
        return posBody.y <= yBorder;
    }

    /**
     * Updates the opacity of the car to signal that it got disabled.
     */
    disable() {
        if (this.visualBody.material instanceof Material) {
            this.visualBody.material.opacity = 0.4;
        }

        this.wheelMeshes.forEach(wheel => {
            if (wheel.material instanceof Material) {
                wheel.material.opacity = 0.4;
            }
        });
    }

    /**
     * Construct a THREE.BufferGeometry from the given vertices and faces in O(faces.length * face.averageLength - 2).
     * Since Cannon and Three construct Polyhedrons differently this conversion is needed.
     * A Three.BufferGeometry is given an array of vertices and according
     * to the itemSize (3) it constructs the geometric shape out of triangles. Faces which can consist of more than 3
     * vertices are split into triangles so the BufferGeometry can process them correctly. Since every face is always a
     * convex shape this is easily doable by selecting an anchor point and drawing triangles to two neighbouring points
     * (excluding the anchor point).
     * For example a pentagon with points {0, 1, 2, 3, 4} (in order and with anchor point 0) will be split into:
     * {0, 1, 2}, {0, 2, 3}, {0, 3, 4}.
     *
     *
     * @param vertices contain all of the Vertices.
     * @param faces define the faces created by the vertices.
     */
    createThreeGeometry(vertices: CANNON.Vec3[], faces: number[[]]): THREE.BufferGeometry {

        let convertedVertices: number[] = [];

        faces.forEach(face => {
            for (let i = 0; i < face.length - 2; i++) {
                convertedVertices.push(vertices[face[0]].x);
                convertedVertices.push(vertices[face[0]].y);
                convertedVertices.push(vertices[face[0]].z);
                convertedVertices.push(vertices[face[i + 1]].x);
                convertedVertices.push(vertices[face[i + 1]].y);
                convertedVertices.push(vertices[face[i + 1]].z);
                convertedVertices.push(vertices[face[i + 2]].x);
                convertedVertices.push(vertices[face[i + 2]].y);
                convertedVertices.push(vertices[face[i + 2]].z);
            }
        })

        let floatVertices = new Float32Array(convertedVertices);

        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(floatVertices, 3));

        return geometry;
    }

    /**
     * Returns the vehicle genome as an Array for the crossover and mutation process.
     */
    toArray() : number[] {
        let genAsArray: number[] = [];
        genAsArray.push(this.vehicleGen.baseWeight);
        genAsArray.push(this.vehicleGen.length);
        genAsArray.push(this.vehicleGen.height);
        genAsArray.push(this.vehicleGen.width);
        this.vehicleGen.wheels.forEach(wheel => {
            genAsArray.push(wheel.radius);
            genAsArray.push(wheel.width);
            genAsArray.push(wheel.posX);
            genAsArray.push(wheel.posY);
            genAsArray.push(wheel.posZ);
            //TODO Material problem
        })

        return genAsArray;
    }

    /**
     * Update the steering angle of each wheel.
     * @param trackWidth width of the track the vehicle is currently driving on.
     */
    updateSteering(trackWidth: number) {
        this.vehicleGen.wheels.forEach((wheel, i) => {
            let positionZ = this.chassisBody.position.z;
            if (wheel.canSteer && (positionZ < -trackWidth / 10 || positionZ > trackWidth / 10)) {

                let steeringValue = Math.max(-0.6, Math.min(0.6, positionZ / trackWidth));
                this.setSteeringValue(steeringValue, i);
            } else {
                this.setSteeringValue(0, i);
            }
        })
    }
}