import * as CANNON from "cannon-es";
import {RigidVehicle} from "cannon-es";
import * as THREE from "three";
import {Material, Mesh} from "three";
import {Groups} from "./Groups";

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
    wheelMaterial = new THREE.MeshPhongMaterial({
        color: 0x2A292B,
        transparent: true,
        opacity: 1.0
    });
    bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xDD6E0F,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });

    constructor(
        lengthX: number,
        lengthY: number,
        lengthZ: number,
        bodyMaterial: CANNON.Material | undefined,
        id: number
    ) {
        super();
        this.id = id;
        this.addCarAndMesh(lengthX, lengthY, lengthZ, bodyMaterial);
    }

    /**
     * Creates a vehicle body in CANNON according to the passed parameters and stores the fitting visual representation in this.visualBody.
     * @param lengthX length of the car.
     * @param lengthY width of the car.
     * @param lengthZ height of the car.
     * @param bodyMaterial defines the bodyMaterial. Needed to calculate collisions between this vehicle and track.
     * @private
     */
    private addCarAndMesh(
        lengthX: number,
        lengthY: number,
        lengthZ: number,
        bodyMaterial: CANNON.Material | undefined
    ) {
        //Add physical Body
        var chassisShape = new CANNON.Box(new CANNON.Vec3(lengthX, lengthY, lengthZ));

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
        this.bodyMass = Math.max(lengthX * lengthY * lengthZ, 1);
        this.vehicleMass = this.vehicleMass + this.bodyMass;

        var body = new CANNON.Body({mass: 100});

        body.addShape(chassisShapeComplex)

        var chassisBody = new CANNON.Body({
            mass: 100,
            position: new CANNON.Vec3(0, 10, 0), //cars spawn 5 meters in the air.
            material: bodyMaterial,
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3,
            shape: chassisShapeComplex
        });

        this.chassisBody = chassisBody;

        //Add visual Body
        var geometry = this.createThreeGeometry(vertices, faces); // double chasis shape

        this.visualBody = new THREE.Mesh(geometry, this.bodyMaterial);
    }

    //Creates a wheel in CANNON according to the passed parameters as well as the fitting visual representation in Three
    addWheelWithMesh(
        radius: number,
        width: number,
        positionX: number,
        positionY: number,
        positionZ: number,
        scene: any,
        wheelMaterial: CANNON.Material
    ) {
        const wheelVolume = Math.PI * width * (radius * radius);
        const wheelMass = Math.max(1, wheelVolume * 3);
        let wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: wheelMaterial,
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
        console.log('bodymass: ' + this.bodyMass);
        console.log('wheelmass: ' + wheelMass);
        console.log(2 * this.bodyMass * wheelMass);

        //Add wheel visual body
        this.addWheelMesh(radius, width, scene);
    }

    //Creates and adds the wheel mesh in Three according to the given parameters.
    private addWheelMesh(radius: number, width: number, scene: any) {
        var wheelVisual = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
        wheelVisual.rotateZ(Math.PI / 2);
        wheelVisual.rotateY(Math.PI / 2);
        var mesh = new THREE.Mesh(wheelVisual, this.wheelMaterial);

        if (scene !== null) {
            scene.add(mesh);
        }
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
}