import * as CANNON from "cannon-es";
import {RigidVehicle} from "cannon-es";
import * as THREE from "three";
import {Mesh} from "three";
import {Groups} from "./Groups";

/**
 * Extends the existing CANNON.RigidVehicle class to make interaction between Three and Cannon easier.
 * An ExtendedRigidVehicle also keeps track of its own furthest position and timeout value inside its assigned world.
 */
export class ExtendedRigidVehicle extends RigidVehicle {
    wheelMeshes: Mesh[] = [];
    carVisualBody: Mesh = new Mesh();
    furthestPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0);
    timeOut: number = 0;
    bodyMass: number = 0;
    vehicleMass: number = 0;
    id: number;
    wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x2A292B });
    bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xDD6E0F,
        side: THREE.DoubleSide
    });

    constructor(
        lengthX: number,
        lengthY: number,
        lengthZ: number,
        bodyMaterial: CANNON.Material,
        id: number
    ) {
        super();
        this.id = id;
        this.addCarAndMesh(lengthX, lengthY, lengthZ, bodyMaterial);
    }

    /**
     *  Creates a vehicle body in CANNON according to the passed parameters and stores the fitting visual representation in this.carVisualBody.
     */
    private addCarAndMesh(
        lengthX: number,
        lengthY: number,
        lengthZ: number,
        bodyMaterial: CANNON.Material
    ) {
        //Add physical Body
        var chassisShape = new CANNON.Box(new CANNON.Vec3(lengthX, lengthY, lengthZ));

        //the bodyMass can't be lighter than 1 Kg
        this.bodyMass = Math.max(lengthX * lengthY * lengthZ, 1);
        this.vehicleMass = this.vehicleMass + this.bodyMass;

        var chassisBody = new CANNON.Body({
            mass: this.bodyMass,
            position: new CANNON.Vec3(0, 5, 0), //cars spawn 5 meters in the air.
            material: bodyMaterial,
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3
        });
        chassisBody.addShape(chassisShape);
        this.chassisBody = chassisBody;

        //Add visual Body
        var geometry = new THREE.BoxGeometry(lengthX * 2, lengthY * 2, lengthZ * 2); // double chasis shape

        this.carVisualBody = new THREE.Mesh(geometry, this.bodyMaterial);
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
            Math.max(5, Math.min(2 * this.bodyMass * wheelMass, 700)),
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
}