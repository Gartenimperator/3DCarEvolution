<script context="module" lang="typescript">
</script>

<script lang="ts">
	import type { Mesh } from 'three';

	import * as CANNON from 'cannon-es';
	import * as THREE from 'three';
	import CannonDebugger from 'cannon-es-debugger';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import Stats from 'three/examples/jsm/libs/stats.module';
	import { Material, RigidVehicle, Vec3, World } from 'cannon-es';
	import { onMount } from 'svelte';

	// Detects webgl
	/*
if ( ! Detector.webgl ) {
Detector.addGetWebGLMessage();
document.getElementById( 'container' ).innerHTML = "";
}
*/

	var stats: any;

	// Graphics variables
	var container: HTMLElement | null;
	var camera: any, controls, scene: any, renderer: any;
	var materialDynamic, materialStatic, materialInteractive: any;
	var XPointer: any;

	// Physics variables
	var worlds: any[] = [];
	var groundBodyContactMaterialOptions = {
		friction: 0.9,
		restitution: 0.1,
		contactEquationRelaxation: 3,
		frictionEquationStiffness: 1e8
	};
	var groundWheelContactMaterialOptions = {
		friction: 0.9,
		restitution: 0.1,
		contactEquationRelaxation: 3,
		frictionEquationStiffness: 1e8
	};
	var worldOptions = {
		allowSleep: true,
		quatNormalizeFast: true,
		quatNormalizeSkip: 1
	};
	var gravity = -9.82;

	//Track matrix
	// Create a matrix of height values
	const matrix: number[][] = [];
	const sizeX = 20;
	const sizeZ = 20;
	for (let i = 0; i < sizeX; i++) {
		matrix.push([]);
		for (let j = 0; j < sizeZ; j++) {
			if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeZ - 1) {
				let height2: number = 3;
				matrix[i].push(height2);
				continue;
			}

			const height3 = Math.cos((i / sizeX) * Math.PI * 2) * Math.cos((j / sizeZ) * Math.PI * 2) + 2;
			matrix[i].push(height3 * 4);
		}
	}

	//Collision Groups
	var GROUP1 = 1;
	var GROUP2 = 2;
	var GROUP3 = 4;

	function initGraphics() {
		container = document.getElementById('container');

		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
		camera.position.x = -15;
		camera.position.y = 10;
		camera.position.z = 0;
		camera.lookAt(new THREE.Vector3(0, 3, 0));

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setClearColor(0xbfd1e5);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);

		var ambientLight = new THREE.AmbientLight(0x404040);
		scene.add(ambientLight);

		var dirLight = new THREE.DirectionalLight(0xffffff, 1);
		dirLight.position.set(10, 10, 5);
		scene.add(dirLight);

		materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
		materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });
		materialInteractive = new THREE.MeshPhongMaterial({ color: 0x990000 });

		if (container !== null) {
			container.innerHTML = '';
			controls = new OrbitControls(camera, container);
			container.appendChild(renderer.domElement);

			stats = Stats();
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
			container.appendChild(stats.domElement);
		}

		var geometryX = new THREE.PlaneGeometry(10, 1, 1);
		var geometryZ = new THREE.PlaneGeometry(10, 1, 1);
		var geometryY = new THREE.PlaneGeometry(10, 1, 1);
		var materialX = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			side: THREE.DoubleSide
		});
		var materialY = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			side: THREE.DoubleSide
		});
		var materialZ = new THREE.MeshBasicMaterial({
			color: 0x123456,
			side: THREE.DoubleSide
		});
		XPointer = new THREE.Mesh(geometryX, materialX);
		var YPointer = new THREE.Mesh(geometryY, materialY);
		var ZPointer = new THREE.Mesh(geometryZ, materialZ);
		XPointer.rotation.x = Math.PI / 2;
		ZPointer.rotation.z = Math.PI / 2;
		YPointer.rotation.y = Math.PI / 2;
		scene.add(XPointer);
		scene.add(YPointer);
		scene.add(ZPointer);

		window.addEventListener('resize', onWindowResize, false);
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	/**
	 * Pyhsics
	 */

	function initPhysics() {
		for (var i = 0; i < population / carsPerWorld; i++) {
			var world = new ExtendedWorld(
				scene,
				worldOptions,
				gravity,
				groundBodyContactMaterialOptions,
				groundWheelContactMaterialOptions
			);
			//world.initTrack(matrix);

			//add Cars
			for (var j = 0; j < carsPerWorld; j++) {
				world.addCar(5, 1, 2);
			}

			worlds.push(world);

			var chassisShape = new CANNON.Box(new CANNON.Vec3(10, 0.1, 50));
			var box = new CANNON.Body({
				mass: 0,
				position: new CANNON.Vec3(40, 2, 0),
				collisionFilterGroup: GROUP3,
				collisionFilterMask: GROUP1
			});
			const rotateParallelToZAxis = new CANNON.Quaternion().setFromEuler(0, 0, 0.4);
			box.addShape(chassisShape, new CANNON.Vec3(), rotateParallelToZAxis);
			world.addBody(box);
		}
		console.log(worlds);
	}

	/**
	 * Main
	 **/

	const frameTime: number = 1 / 60;
	const delta: number = 1; //???

	function updatePhysics() {
		// update the chassis position
		worlds.forEach((world) => {
			world.updatePhysicsWithScene(frameTime);
		});
	}

	function render() {
		requestAnimationFrame(render);
		updatePhysics();
		worlds.forEach((world) => {
			world.cannonDebugRenderer.update();
		});
		renderer.render(scene, camera);
		stats.update();
	}

	var population: number = 30;
	var carsPerWorld: number = 30;

	onMount(() => {
		initGraphics();
		initPhysics();

		render();
	});

	class ExtendedRigidVehicle extends RigidVehicle {
		wheelMeshes: Mesh[] = [];
		carVisualBody: Mesh;

		constructor(lengthX: number, lengthY: number, lengthZ: number, bodyMaterial: CANNON.Material) {
			super();
			this.carVisualBody = this.addCarBodyMesh(lengthX, lengthY, lengthZ, bodyMaterial);
		}

		addCarBodyMesh(
			lengthX: number,
			lengthY: number,
			lengthZ: number,
			bodyMaterial: CANNON.Material
		) {
			//Add physical Body
			var chassisShape = new CANNON.Box(new CANNON.Vec3(lengthX, lengthY, lengthZ));
			var chassisBody = new CANNON.Body({
				mass: 10,
				position: new CANNON.Vec3(0, 5, 0),
				material: bodyMaterial,
				collisionFilterGroup: GROUP1,
				collisionFilterMask: GROUP2 | GROUP3
			});
			chassisBody.addShape(chassisShape);
			this.chassisBody = chassisBody;

			//Add visual Body
			var geometry = new THREE.BoxGeometry(lengthX * 2, lengthY * 2, lengthZ * 2); // double chasis shape
			var material = new THREE.MeshBasicMaterial({
				color: 0xffff00,
				side: THREE.DoubleSide
			});
			var box = new THREE.Mesh(geometry, material);
			if (scene !== null) {
				scene.add(box);
			}
			return box;
		}

		addWheelWithMesh(
			radius: number,
			width: number,
			positionX: number,
			positionY: number,
			positionZ: number,
			scene: any,
			wheelMaterial: CANNON.Material
		) {
			var wheelVolume = Math.PI * width * (radius * radius);
			let wheelBody = new CANNON.Body({
				mass: wheelVolume,
				material: wheelMaterial,
				collisionFilterGroup: GROUP1,
				collisionFilterMask: GROUP2 | GROUP3
			});

			const rotateParallelToXAxis = new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0);
			const shape = new CANNON.Cylinder(radius, radius, width, 25);
			wheelBody.addShape(shape, new CANNON.Vec3(), rotateParallelToXAxis);
			wheelBody.angularDamping = 0.4;

			this.addWheel({
				body: wheelBody,
				position: new CANNON.Vec3(positionX, positionY, positionZ),
				axis: new CANNON.Vec3(0, 0, -1)
			});

			this.setWheelForce(100, this.wheelBodies.length - 1);

			// wheel visual body
			this.addWheelMesh(radius, width, scene);
		}

		addWheelMesh(radius: number, width: number, scene: any) {
			var wheelVisual = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
			wheelVisual.rotateZ(Math.PI / 2);
			wheelVisual.rotateY(Math.PI / 2);
			var mesh = new THREE.Mesh(wheelVisual, materialInteractive);
			mesh.add(
				new THREE.Mesh(
					new THREE.BoxGeometry(width * 1.5, radius, radius * 0.5, 1, 1, 1),
					materialInteractive
				)
			);

			if (scene !== null) {
				scene.add(mesh);
			}
			this.wheelMeshes.push(mesh);
		}
	}

	class ExtendedWorld extends World {
		scene: any;
		cars: ExtendedRigidVehicle[] = [];
		cannonDebugRenderer: any;
		groundMaterial: CANNON.Material = new CANNON.Material('groundMaterial');
		wheelMaterial: CANNON.Material = new CANNON.Material('wheelMaterial');
		bodyMaterial: CANNON.Material = new CANNON.Material('bodyMaterial');

		constructor(
			scene: any,
			options: any,
			gravity: number,
			groundBodyContactMaterialOptions: any,
			groundWheelContactMaterialOptions: any
		) {
			super(options);
			this.scene = scene;
			this.gravity.set(0, gravity, 0);
			this.initPhysics(groundBodyContactMaterialOptions, groundWheelContactMaterialOptions);

			//Uncomment for debug information
			this.cannonDebugRenderer = CannonDebugger(this.scene, this);
		}

		addCar(lengthX: number, lengthY: number, lengthZ: number) {
			let vehicle = new ExtendedRigidVehicle(lengthX, lengthY, lengthZ, this.bodyMaterial);

			const axisWidth = 4;
			const radius = 2;
			const width = 0.5;

			for (var i = 0; i < 4; i++) {
				vehicle.addWheelWithMesh(
					radius,
					width,
					-4 + Math.random() * 9,
					0,
					-2 + Math.random() * 5,
					this.scene,
					this.wheelMaterial
				);
			}

			this.cars.push(vehicle);
			vehicle.addToWorld(this);
		}

		updatePhysicsWithScene(frameTime: number) {
			//world.step(frameTime, delta, 1);
			this.step(frameTime);

			//update position of cars inside the scene
			this.cars.forEach((car) => {
				const posBody = car.chassisBody.position;
				const quatBody = car.chassisBody.quaternion;
				car.carVisualBody.position.set(posBody.x, posBody.y, posBody.z);
				car.carVisualBody.quaternion.set(quatBody.x, quatBody.y, quatBody.z, quatBody.w);
				for (var i = 0; i < car.wheelBodies.length; i++) {
					const posWheel = car.wheelBodies[i].position;
					const quatWheel = car.wheelBodies[i].quaternion;
					car.wheelMeshes[i].position.set(posWheel.x, posWheel.y, posWheel.z);
					car.wheelMeshes[i].quaternion.set(quatWheel.x, quatWheel.y, quatWheel.z, quatWheel.w);
				}
			});
		}

		updatePhysicsWithoutScene(frameTime: number) {
			//world.step(frameTime, delta, 1);
			this.step(frameTime);
		}

		initPhysics(bodyGroundOptiones: any, wheelGroundOptions: any) {
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

			var q = XPointer.quaternion;
			var planeBody = new CANNON.Body({
				mass: 0, // mass = 0 makes the body static
				material: this.groundMaterial,
				shape: new CANNON.Plane(),
				quaternion: new CANNON.Quaternion(-q._x, q._y, q._z, q._w),
				collisionFilterGroup: GROUP2,
				collisionFilterMask: GROUP1
			});

			this.addBody(planeBody);
		}

		initTrack(matrix: number[][]) {
			// Create the heightfield
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
	}
</script>

<div class="wrapper">
	<div id="container" />
	<div id="speedometer" />
</div>

<style>
	* {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
	html,
	body,
	canvas {
		width: 100%;
		height: 100%;
		background: #aaa;
	}
</style>
