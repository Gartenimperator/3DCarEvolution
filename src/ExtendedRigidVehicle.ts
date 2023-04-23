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
    wheelMaterial = new THREE.MeshBasicMaterial({
        color: 0x2A292B,
        transparent: true,
        opacity: 1.0
    });
    bodyMaterial = new THREE.MeshBasicMaterial({
        color: 'red',
        transparent: true,
        opacity: 1.0
    });
    vehicleGen: vehicleGenome;

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
        let vertices: CANNON.Vec3[] = [
            new CANNON.Vec3(0, 0, 0),
            new CANNON.Vec3(1, 10, -5),
            new CANNON.Vec3(5, 0, 5),
            new CANNON.Vec3(-5, 0, 0)
        ];

        let faces = [
            [0, 3, 1],
            [0, 1, 2],
            [0, 2, 3],
            [2, 1, 3]
        ]

        let polyoptions = {
            vertices: vertices,
            faces: faces
        }

        let chassisShapeComplex = new CANNON.ConvexPolyhedron(polyoptions);

        //the bodyMass can't be lighter than 1 Kg
        this.bodyMass = 100;
        this.vehicleMass = this.vehicleMass + this.bodyMass;
        this.chassisBody = new CANNON.Body({
            mass: 100,
            position: new CANNON.Vec3(0, 10, 0), //cars spawn 10 meters in the air.
            material: bodyMaterial,
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3,
            shape: chassisShapeComplex
        });

        //Add visual Body
        if (scene != undefined) {
            let geometry = this.createThreeGeometry(vertices, faces); // double chasis shape
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
     * @param scene the wheel is placed inside of. If the param is undefined no visual THREE.Mesh will be created.
     */
    addWheelWithMesh(
        radius: number,
        width: number,
        positionX: number,
        positionY: number,
        positionZ: number,
        physicalWheelMaterial: CANNON.Material | undefined,
        scene: THREE.Scene | undefined
    ) {

        //Add wheel physical body
        if (physicalWheelMaterial != undefined) {
            this.addPhysicalWheel(radius, width, positionX, positionY, positionZ, physicalWheelMaterial);
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
     * @private
     */
    private addPhysicalWheel(radius: number,
                             width: number,
                             positionX: number,
                             positionY: number,
                             positionZ: number,
                             physicalWheelMaterial: CANNON.Material) {
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
        wheelBody.angularDamping = 0.5;

        this.addWheel({
            body: wheelBody,
            position: new CANNON.Vec3(positionX, positionY, positionZ),
            axis: new CANNON.Vec3(0, 0, -1)
        });

        this.vehicleMass = this.vehicleMass + wheelMass;

        this.setWheelForce(
            Math.max(5, Math.min(3 * this.bodyMass * wheelMass, 700)),
            this.wheelBodies.length - 1
        );
    }

    //Creates and adds the wheel mesh in Three according to the given parameters.
    private addWheelMesh(radius: number, width: number, scene: THREE.Scene) {
        var wheelVisual = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
        wheelVisual.rotateZ(Math.PI / 2);
        wheelVisual.rotateY(Math.PI / 2);
        var mesh = new THREE.Mesh(wheelVisual, this.wheelMaterial);
        scene.add(mesh);
        this.wheelMeshes.push(mesh);
    }

    /**
     * Updates the timeout of a car during the simulation and decides whever it should get timed-out.
     *
     * @param timeOut the max amout of timeOut a car can have.
     * @param yBorder describes the lowest point of the track.
     * @return true if and only if the car should be timedout.
     */
    advanceTimeoutAndCheckIfDisabled(timeOut: number, yBorder: number): boolean {

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
        }

        //Return true if this car has fallen off the track.
        return posBody.y <= yBorder;
    }

    /**
     * Updates the opacity of the car to signal that it got disabled.
     */
    disable() {
        if (this.visualBody.material instanceof Material) {
            this.visualBody.material.opacity = 0.5;
        }

        this.wheelMeshes.forEach(wheel => {
            if (wheel.material instanceof Material) {
                wheel.material.opacity = 0.5;
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
}