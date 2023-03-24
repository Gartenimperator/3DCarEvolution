<script context="module" lang="typescript">
</script>

<script lang="ts">
	import type { Mesh } from 'three';

	import * as CANNON from 'cannon-es';
	import * as THREE from 'three';
	import CannonDebugger from 'cannon-es-debugger';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { RigidVehicle } from 'cannon-es';
	import { onMount } from 'svelte';

	// Detects webgl
	/*
if ( ! Detector.webgl ) {
Detector.addGetWebGLMessage();
document.getElementById( 'container' ).innerHTML = "";
}
*/

	// - Global variables -
	var ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

	// Graphics variables
	var container: HTMLElement | null;
	var camera: any, controls, scene: any, renderer: any;
	var texture;
	var clock = new THREE.Clock();
	var materialDynamic, materialStatic, materialInteractive: any;
	var XPointer: any;

	// Physics variables
	var world: any;
	var cannonDebugRenderer: any;
	var bodyMaterial;
	var wheelMaterial: any;
	var groundMaterial;

	//Collision Groups
	var GROUP1 = 1;
	var GROUP2 = 2;

	//carList
	var carList: ExtendedRigidVehicle[] = [];

	var time = 0;

	// Keybord actions
	var actions = {};

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
	 * Physics
	 **/

	function initPhysics() {
		world = new CANNON.World();
		world.broadphase = new CANNON.SAPBroadphase(world);
		world.gravity.set(0, -9.82, 0);
		world.defaultContactMaterial.friction = 1;

		cannonDebugRenderer = CannonDebugger(scene, world);

		groundMaterial = new CANNON.Material('groundMaterial');
		wheelMaterial = new CANNON.Material('wheelMaterial');
		bodyMaterial = new CANNON.Material('bodyMaterial');
		var wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
			friction: 0.5,
			restitution: 0.3,
			contactEquationRelaxation: 3,
			frictionEquationStiffness: 10000
		});

		var bodyGroundContactMaterial = new CANNON.ContactMaterial(bodyMaterial, groundMaterial, {
			friction: 0.9,
			restitution: 0.1,
			contactEquationRelaxation: 3,
			frictionEquationStiffness: 1e8
		});

		world.addContactMaterial(wheelGroundContactMaterial);
		world.addContactMaterial(bodyGroundContactMaterial);

		var q = XPointer.quaternion;
		var planeBody = new CANNON.Body({
			mass: 0, // mass = 0 makes the body static
			material: groundMaterial,
			shape: new CANNON.Plane(),
			quaternion: new CANNON.Quaternion(-q._x, q._y, q._z, q._w),
			collisionFilterGroup: GROUP2,
			collisionFilterMask: GROUP1
		});
		world.addBody(planeBody);
	}

	/**
	 * init a car
	 */

	function createExtendedCar() {
		const lengthX = 4;
		const lengthY = 1;
		const lengthZ = 2;

		let vehicle = new ExtendedRigidVehicle(lengthX, lengthY, lengthZ);

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
				scene
			);
		}
		console.log(vehicle);

		carList.push(vehicle);
		vehicle.addToWorld(world);
	}

	/**
	 * Main
	 **/

	function updatePhysics() {
		world.step(1 / 60);

		// update the chassis position
		carList.forEach((car) => {
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

	function render() {
		requestAnimationFrame(render);
		updatePhysics();
		cannonDebugRenderer.update();
		renderer.render(scene, camera);
	}

	var population: number = 5;

	onMount(() => {
		initGraphics();
		initPhysics();

		const data: any[] = [];
		for (let i = 0; i < 1000; i++) {
			const y = 0.5 * Math.cos(0.2 * i);
			data.push(y);
		}

		const heightFieldShape = new CANNON.Heightfield(data, {
			elementSize: 1
		});
		const heightfieldBody = new CANNON.Body({ shape: heightFieldShape });
		world.addBody(heightfieldBody);

		for (var i = 0; i < population; i++) {
			//createExtendedCar();
		}
		render();
	});

	class ExtendedRigidVehicle extends RigidVehicle {
		wheelMeshes: Mesh[] = [];
		carVisualBody: Mesh;

		constructor(lengthX: number, lengthY: number, lengthZ: number) {
			super();
			this.carVisualBody = this.addCarBodyMesh(lengthX, lengthY, lengthZ);
		}

		addCarBodyMesh(lengthX: number, lengthY: number, lengthZ: number) {
			//Add physical Body
			var chassisShape = new CANNON.Box(new CANNON.Vec3(lengthX, lengthY, lengthZ));
			var chassisBody = new CANNON.Body({
				mass: 10,
				position: new CANNON.Vec3(0, 3, 0),
				collisionFilterGroup: GROUP1,
				collisionFilterMask: GROUP2
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
			scene.add(box);
			return box;
		}

		addWheelWithMesh(
			radius: number,
			width: number,
			positionX: number,
			positionY: number,
			positionZ: number,
			scene: any
		) {
			var wheelVolume = Math.PI * width * (radius * radius);
			let wheelBody = new CANNON.Body({
				mass: wheelVolume,
				material: wheelMaterial,
				collisionFilterGroup: GROUP1,
				collisionFilterMask: GROUP2
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

			scene.add(mesh);
			this.wheelMeshes.push(mesh);
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
