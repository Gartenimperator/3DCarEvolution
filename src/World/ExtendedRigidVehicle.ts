import * as CANNON from "cannon-es";
import {RigidVehicle} from "cannon-es";
import * as THREE from "three";
import {Material, Mesh, Scene} from "three";
import {Groups} from "../Utils/Groups";
import {vehicleGenome, wheel} from "./ExtendedWorld";
import qh from 'quickhull3d';
import {vehGenConstants} from "../VehicleModel/VehicleGenerationConstants";
import {RainBowColor} from "../Utils/ColorCoder";
import {getVolumeAndCentreOfMass, intersectLineAndPlane} from "../Utils/MathHelper";
import {toNumberArray, toSplitArray} from "../Utils/VehicleGenArrayHelper";

/**
 * Extends the existing CANNON.RigidVehicle class to make interaction between Three and Cannon easier.
 * An ExtendedRigidVehicle also keeps track of its own furthest position and timeout value inside its assigned world.
 */
export class ExtendedRigidVehicle extends RigidVehicle {
    wheelMeshes: Mesh[] = [];
    visualBody: Mesh = new Mesh();
    furthestPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0);
    lowestPoint: number = 100;
    timeOut: number = 0;
    bodyMass: number = 0;
    vehicleMass: number = 0;
    wheelMass: number = 0;
    id: number;
    prevVelocity: number = 0;
    wheelMaterial = new THREE.MeshLambertMaterial({
        color: 0x191919
    });
    bodyMaterial = new THREE.MeshBasicMaterial({
        color: 0xC4151C
    });
    lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });
    vehicleGen: vehicleGenome;
    private faces: number[][] = [];
    hasFinished: boolean = false;
    private centeredBodyVectors: CANNON.Vec3[] = [];
    private activeWheels: wheel[] = [];

    constructor(
        vehicleGen: vehicleGenome,
        physicalBodyMaterial: CANNON.Material | undefined,
        physicalWheelMaterial: CANNON.Material | undefined,
        useRealisticWheels: boolean,
        scene: Scene | undefined,
        id: number
    ) {
        super();
        this.vehicleGen = vehicleGen;
        this.id = id;

        this.addBody(physicalBodyMaterial, scene);
        this.addWheels(physicalWheelMaterial, scene, useRealisticWheels);
        this.adjustPosition();
    }

    /**
     * Creates the physical CANNON.Body and the corresponding visual representation in the THREE.scene.
     * @param bodyMaterial of the vehicle body. If it is undefined no body will be created.
     * @param scene the scene which renders the body. If it is undefined no THREE.Mesh will be created.
     */
    addBody(bodyMaterial: CANNON.Material | undefined, scene: Scene | undefined) {

        if (this.vehicleGen.bodyVectors.length < 4) {
            return;
        }

        let vertices = toNumberArray(this.vehicleGen.bodyVectors);

        this.faces = qh(vertices, {
            skipTriangulation: false,
        });

        let tempVol = getVolumeAndCentreOfMass(vertices, this.faces);

        if (tempVol[0] === 0) {
            throw new Error("Body has no volume");
        }

        this.centeredBodyVectors = this.moveBodyCOMTo0AndUpdateLowestPoint(this.vehicleGen.bodyVectors, tempVol[1]);
        let updatedVertices = toNumberArray(this.centeredBodyVectors);

        this.vehicleMass += tempVol[0] * 10;
        this.bodyMass = tempVol[0] * 10;

        let chassisBody = new CANNON.Body({
            mass: this.bodyMass,
            material: bodyMaterial,
            position: new CANNON.Vec3(0, 0, 0),
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3
        });

        //Shape for the physical vehicle body.
        this.faces.forEach(face => {
            let chassisShapeComplex = new CANNON.ConvexPolyhedron({
                vertices: [this.centeredBodyVectors[face[0]], this.centeredBodyVectors[face[1]], this.centeredBodyVectors[face[2]]],
                faces: [[0, 1, 2]]
            });
            chassisBody.addShape(chassisShapeComplex);
        })

        this.chassisBody = chassisBody;

        //Add visual Body
        if (scene != undefined) {
            this.visualBody = this.createThreeMesh(updatedVertices, this.faces);
            scene.add(this.visualBody);
        }
    }

    /**
     * Creates a vehicle body in CANNON according to the passed parameters and stores the fitting visual representation in this.visualBody.
     * @param scene which the wheels will be added to, if it exists.
     * @param physicalWheelMaterial physicalMaterial of the wheel.
     * @param useRealisticWheels
     * @private
     */
    private addWheels(physicalWheelMaterial: CANNON.Material | undefined, scene: THREE.Scene | undefined, useRealisticWheels: boolean) {
        let lowestWheelPosition = 1000;
        //Add wheels to the car.
        for (let i = 0; i < this.vehicleGen.wheels.length; i++) {
            if (physicalWheelMaterial != undefined) {

                this.addWheelWithMesh(
                    this.vehicleGen.wheels[i].radius,
                    this.vehicleGen.wheels[i].width,
                    this.vehicleGen.wheels[i].posX, //length - x
                    this.vehicleGen.wheels[i].posY, //height - y
                    this.vehicleGen.wheels[i].posZ, //width - z
                    this.vehicleGen.wheels[i].density,
                    this.vehicleGen.wheels[i].stiffness,
                    this.vehicleGen.wheels[i].canSteer,
                    useRealisticWheels,
                    physicalWheelMaterial,
                    scene
                );

                this.activeWheels.push(this.vehicleGen.wheels[i]);

                if (lowestWheelPosition > (this.wheelBodies[i].position.y - this.vehicleGen.wheels[i].radius)) {
                    lowestWheelPosition = (this.wheelBodies[i].position.y - this.vehicleGen.wheels[i].radius);
                }
            }
        }
        if (lowestWheelPosition < this.lowestPoint) {
            this.lowestPoint = lowestWheelPosition;
        }
    }

    /**
     * Creates a wheel with CANNON according to the passed parameters as well as the fitting visual representation in Three.
     * @param radius of the wheel.
     * @param width of the wheel.
     * @param positionX
     * @param positionY
     * @param positionZ
     * @param density of the wheel.
     * @param stiffness
     * @param physicalWheelMaterial of the wheel. If the param is undefined no physical CANNON.Body will be created.
     * @param canSteer defines if the wheel is steerable or not.
     * @param useRealisticWheels
     * @param scene the wheel is placed inside of. If the param is undefined no visual THREE.Mesh will be created.
     */
    addWheelWithMesh(
        radius: number,
        width: number,
        positionX: number,
        positionY: number,
        positionZ: number,
        density: number,
        stiffness: number,
        canSteer: boolean,
        useRealisticWheels: boolean,
        physicalWheelMaterial: CANNON.Material,
        scene: THREE.Scene | undefined
    ) {
        //Add wheel physical body
        if (physicalWheelMaterial) {
            this.addPhysicalWheel(radius, width, positionX, positionY, positionZ, density, stiffness, physicalWheelMaterial, canSteer, useRealisticWheels);
        }

        //Add wheel visual body
        if (scene != undefined) {
            this.addWheelMesh(radius, width, density, scene, useRealisticWheels);
        }
    }

    /**
     * Adds a wheel according to the parameters.
     * @param radius of the wheel.
     * @param width of the wheel.
     * @param positionX
     * @param positionY
     * @param positionZ
     * @param density
     * @param stiffness
     * @param physicalWheelMaterial of the wheel.
     * @param canSteer defines if the wheel is steerable or not.
     * @param useRealisticWheels
     * @private
     */
    private addPhysicalWheel(radius: number,
                             width: number,
                             positionX: number,
                             positionY: number,
                             positionZ: number,
                             density: number,
                             stiffness: number,
                             physicalWheelMaterial: CANNON.Material,
                             canSteer: boolean,
                             useRealisticWheels: boolean) {
        let shape;
        let wheelVolume;

        if (useRealisticWheels) {
            shape = new CANNON.Cylinder(radius, radius, width, 25);
            wheelVolume = Math.PI * width * (radius * radius);
        } else {
            shape = new CANNON.Sphere(radius);
            wheelVolume = Math.PI * width * (radius * radius);
        }

        let wheelMass = wheelVolume * density;

        let wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: physicalWheelMaterial,
            collisionFilterGroup: Groups.GROUP1,
            collisionFilterMask: Groups.GROUP2 | Groups.GROUP3
        });

        new THREE.Euler();

        const rotateParallelToXAxis = new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0);

        wheelBody.addShape(shape, new CANNON.Vec3(), rotateParallelToXAxis);
        wheelBody.angularDamping = 0.7;

        this.addWheel({
            body: wheelBody,
            position: this.getWheelPosition(positionX, positionY, positionZ, radius, useRealisticWheels ? width : radius),
            axis: new CANNON.Vec3(0, 0, -1)
        });

        //set Stiffness
        this.constraints[this.wheelBodies.length - 1].equations[1].setSpookParams(10000 + 1000000 * stiffness, 4, 1 / 60);
        this.constraints[this.wheelBodies.length - 1].equations[2].setSpookParams(1000000000, 1, 1 / 60);

        this.vehicleMass += wheelMass;
        this.wheelMass = this.wheelMass + wheelMass;
    }

    /**
     * Helper method for adding wheels. Creates and adds the wheelMesh according to the given parameters.
     * @param radius of the wheel.
     * @param width of the wheel.
     * @param density
     * @param scene the wheel is added to.
     * @param useRealisticWheels
     */
    addWheelMesh(radius: number, width: number, density: number, scene: THREE.Scene, useRealisticWheels: boolean) {
        let wheelVisual;
        let wheelHood;
        let wheelMesh;

        if (useRealisticWheels) {
            wheelVisual = new THREE.CylinderGeometry(radius, radius, width, 26, 1);
            wheelHood = new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, width + 0.1, 20, 1);

            //rotate so it aligns with the wheels pointing towards the CANNON.js x-coordinate.
            wheelVisual.rotateZ(Math.PI / 2);
            wheelHood.rotateZ(Math.PI / 2);
            wheelVisual.rotateY(Math.PI / 2);
            wheelHood.rotateY(Math.PI / 2);

            let wheelHoodMaterial = new THREE.MeshLambertMaterial();
            wheelHoodMaterial.color = new THREE.Color(RainBowColor(density / 10, vehGenConstants.maxDensity / 10));
            wheelMesh = new THREE.Mesh(wheelVisual, this.wheelMaterial);
            wheelMesh.add(new THREE.Mesh(wheelHood, wheelHoodMaterial));
            wheelMesh.add(new THREE.Mesh(new THREE.BoxGeometry(radius * 0.6, radius * 0.2, width + 0.15), this.wheelMaterial));
            wheelMesh.add(new THREE.Mesh(new THREE.BoxGeometry(radius * 2, radius * 0.2, width - 0.05), wheelHoodMaterial));
        } else {
            wheelVisual = new THREE.SphereGeometry(radius);

            let wheelVisualMaterial = new THREE.MeshLambertMaterial();
            wheelVisualMaterial.color = new THREE.Color(RainBowColor(density, vehGenConstants.maxDensity));
            wheelMesh = new THREE.Mesh(wheelVisual, wheelVisualMaterial);
            wheelMesh.add(new THREE.Mesh(new THREE.BoxGeometry(radius * 2, radius * 0.15, radius * 0.15), this.wheelMaterial).rotateZ(90));
            wheelMesh.add(new THREE.Mesh(new THREE.BoxGeometry(radius * 2, radius * 0.15, radius * 0.15), this.wheelMaterial));
        }

        scene.add(wheelMesh);
        this.wheelMeshes.push(wheelMesh);
    }

    /**
     * Updates the timeout of a car during the simulation and decides whever it should get disabled. This might be due
     * to falling off the track, finishing or simply being to slow.
     *
     * @param timeOut the max amount of timeOut a car can have.
     * @param yBorder describes the lowest point of the track.
     * @param finishLine is the x-coordinate of the finish line.
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

        if (this.chassisBody.velocity.length() - this.prevVelocity > 5) {
            // console.log("A vehicle might have bugged. Removing it just to be safe... vehicleGen follows:");
            // let temp = toSplitArray(this.vehicleGen);
            // console.log(temp[0] + '|' + temp[1]);
            return true;
        }

        this.prevVelocity = this.chassisBody.velocity.length();
        //Return true if this car has fallen off the track and should be disabled
        return posBody.y <= yBorder;
    }

    /**
     * Updates the opacity of the car to signal that it got disabled.
     */
    disable() {
        if (this.visualBody.material instanceof Material) {
            this.lineMaterial.color = new THREE.Color('white');
        }

        this.wheelMeshes.forEach(wheel => {
            if (wheel.material instanceof Material) {
                wheel.material.opacity = 0.3;
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
    createThreeMesh(vertices: number[][], faces: number[][]): THREE.Mesh {

        let convertedVertices: number[] = [];

        const points: THREE.Vector3[] = [];

        faces.forEach(face => {
            convertedVertices.push(vertices[face[0]][0]);
            convertedVertices.push(vertices[face[0]][1]);
            convertedVertices.push(vertices[face[0]][2]);
            convertedVertices.push(vertices[face[1]][0]);
            convertedVertices.push(vertices[face[1]][1]);
            convertedVertices.push(vertices[face[1]][2]);
            convertedVertices.push(vertices[face[2]][0]);
            convertedVertices.push(vertices[face[2]][1]);
            convertedVertices.push(vertices[face[2]][2]);

            points.push(new THREE.Vector3(vertices[face[0]][0], vertices[face[0]][1], vertices[face[0]][2]));
            points.push(new THREE.Vector3(vertices[face[1]][0], vertices[face[1]][1], vertices[face[1]][2]));
            points.push(new THREE.Vector3(vertices[face[2]][0], vertices[face[2]][1], vertices[face[2]][2]));
        })

        let test = new THREE.BufferGeometry().setFromPoints(points);
        const material = this.lineMaterial;
        const lines = new THREE.Line(test, material);

        let floatVertices = new Float32Array(convertedVertices);

        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(floatVertices, 3));
        let mesh = new THREE.Mesh(geometry, this.bodyMaterial);
        mesh.add(lines);
        return mesh;
    }

    /**
     * Update the steering angle of each wheel and apply power.
     * @param trackWidth width of the track the vehicle is currently driving on.
     */
    updateSteeringAndApplyPower(trackWidth: number): boolean {
        let carIsFine = true;
        this.activeWheels.forEach((wheel, i) => {
            let positionZ = this.chassisBody.position.z;

            if (wheel.canSteer && (positionZ < -trackWidth / 10 || positionZ > trackWidth / 10)) {
                let steeringValue = Math.max(-0.6, Math.min(0.6, positionZ / trackWidth));
                this.setSteeringValue(steeringValue, i);
            } else {
                this.setSteeringValue(0, i);
            }

            let currentSpeed = this.wheelBodies[i].angularVelocity.length();
            let wheelMass = this.wheelBodies[i].mass;

            let wheelForce = Math.max(0, 500 + 5 * this.bodyMass + ((wheelMass + 50) * 90) - (wheelMass * (wheelMass / 7) * currentSpeed));

            if (currentSpeed > 40) {
                wheelForce = 0;
            }

            if (this.wheelMass > this.bodyMass) {
                wheelForce = wheelForce * (1 - (this.wheelMass / this.vehicleMass));
            }

            wheelForce = wheel.canSteer ? wheelForce * 0.7 : wheelForce;

            if (isNaN(wheelForce)) {
                console.log("An Error has occured while simulating a vehicle. The corresponding VehicleGen follows:")
                let temp = toSplitArray(this.vehicleGen);
                console.log(temp[0] + '|' + temp[1]);
                carIsFine = false;
            } else {
                this.applyWheelForce(wheelForce, i);
            }
        });
        return carIsFine;
    }

    private moveBodyCOMTo0AndUpdateLowestPoint(bodyVector: CANNON.Vec3[], com: CANNON.Vec3) {
        let centerBodyVectors: CANNON.Vec3[] = [];
        bodyVector.forEach((vector, i) => {
            centerBodyVectors.push(vector.vsub(com));
            if (this.lowestPoint > centerBodyVectors[i].y) {
                this.lowestPoint = centerBodyVectors[i].y - 0.1;
            }
        })
        return centerBodyVectors;
    }

    private adjustPosition() {
        this.chassisBody.position.set(0, -this.lowestPoint + 1, 0);
        this.wheelBodies.forEach(wheel => {
            wheel.position.y += -this.lowestPoint + 1;
        })
    }

    /**
     * Call this function after the body has been initialized to calculate the connectionpoint between the given vector
     * and the body.
     * @private
     * @param x
     * @param y
     * @param z
     * @param radius
     * @param width
     */
    private getWheelPosition(x: number, y: number, z: number, radius: number, width: number): CANNON.Vec3 {
        let closest = new CANNON.Vec3(1000, 1000, 1000);
        this.chassisBody.shapes.forEach(shape => {
            if (shape instanceof CANNON.ConvexPolyhedron) {
                let planeN = shape.faceNormals[0];
                let planeP = shape.vertices[0];
                let point = intersectLineAndPlane([0, 0, 0], [x, y, z],
                    [planeP.x, planeP.y, planeP.z], [planeN.x, planeN.y, planeN.z]);
                if (point) {
                    let vec = new CANNON.Vec3(point[0], point[1], point[2]);
                    if (closest.length() > vec.length()) {
                        closest = vec;
                    }
                }
            }
        })

        //adjust position by width or radius
        let adjust = 1 + (radius > width ? width : radius) / closest.length();
        closest.scale(adjust, closest);

        return closest;
    }
}