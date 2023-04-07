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
	import { arraySlice } from 'three/src/animation/AnimationUtils';

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

	var activeWorlds: Map<number, ExtendedWorld> = new Map();
	var inactiveWorlds: Map<number, ExtendedWorld> = new Map();
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
	const frameTime: number = 1 / 60;
	const fastForwardFrameTime: number = 1 / 20;
	const delta: number = 1; //???

	//Track gradient array

	var steps: number[] = [
		-90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0,
		0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90, -90, 0, 0, -90, -90, -90,
		-90, 0, 0, -90
	];
	var notWorking: number[] = [170, -170, -120];

	var trackGradients: number[] = steps;
	var trackPieceLengthX: number = 5;

	//Generic-Algorithm global variables

	var generationCounter: number = 1;
	var carIdCounter: number = 1;
	var finished: boolean = false;

	var population: number = 50;
	var amountOfWorlds: number = 1;

	var timeOut: number = 420;

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

		var geometryX = new THREE.PlaneGeometry(40, 1, 1);
		var materialX = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			side: THREE.DoubleSide
		});
		XPointer = new THREE.Mesh(geometryX, materialX);
		XPointer.rotation.x = Math.PI / 2;
		scene.add(XPointer);

		window.addEventListener('resize', onWindowResize, false);
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	/**
	 * Initializes the worlds at the start of the genetic algorithm
	 */
	function initWorlds() {
		for (var i = 0; i < amountOfWorlds; i++) {
			var world = new ExtendedWorld(
				scene,
				worldOptions,
				gravity,
				groundBodyContactMaterialOptions,
				groundWheelContactMaterialOptions,
				population,
				i
			);
			//world.initTrackWithHeightfield(matrix);
			world.initTrackWithGradients(trackGradients, trackPieceLengthX);

			activeWorlds.set(world.id, world);
		}
		console.log(activeWorlds);
	}

	/**
	 * Main
	 **/

	/**
	 * Calculates one step for each active world.
	 */
	function updatePhysics() {
		// update the chassis position
		activeWorlds.forEach((world) => {
			//only update worlds with active cars
			if (world.populationManager.populationSize > 0) {
				world.updatePhysicsWithScene(frameTime);

				//uncomment to view debug mode
				world.cannonDebugRenderer.update();
			} else {
				console.log('Disabling world with id: ' + world.id);
				activeWorlds.delete(world.id);
				inactiveWorlds.set(world.id, world);
			}
		});
	}

	/**
	 * Looping function which syncs the Three.scene and ExtendendWorld after each calculation step.
	 */
	function render() {
		requestAnimationFrame(render);

		if (activeWorlds.size > 0) {
			updatePhysics();
		} else {
			//next steps in the generation
			//let render() run, allows the user to move around the map
		}

		renderer.render(scene, camera);
		stats.update();
	}

	/**
	 * Svelte function which is called after the DOM has been fully initialized.
	 */
	onMount(() => {
		initGraphics();
		initWorlds();

		render();
	});

	/**
	 * Extends the existing CANNON.RigidVehicle class to make interaction between Three and Cannon easier.
	 * An ExtendedRigidVehicle also keeps track of its own furthest position and timeout value inside its assigned world.
	 */
	class ExtendedRigidVehicle extends RigidVehicle {
		wheelMeshes: Mesh[] = [];
		carVisualBody: Mesh;
		furthestPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0);
		timeOut: number = 0;
		id: number;

		constructor(
			lengthX: number,
			lengthY: number,
			lengthZ: number,
			bodyMaterial: CANNON.Material,
			id: number
		) {
			super();
			this.id = id;
			this.carVisualBody = this.addCarBodyMesh(lengthX, lengthY, lengthZ, bodyMaterial);
		}

		//Creates a vehiclebody in CANNON according to the passed parameters as well as the fitting visual representation in Three
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
			var wheelVolume = Math.PI * width * (radius * radius);
			let wheelBody = new CANNON.Body({
				mass: wheelVolume,
				material: wheelMaterial,
				collisionFilterGroup: GROUP1,
				collisionFilterMask: GROUP2 | GROUP3
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

			this.setWheelForce(150, this.wheelBodies.length - 1);

			//Add wheel visual body
			this.addWheelMesh(radius, width, scene);
		}

		//Creates and adds the wheel mesh in Three according to the given parameters.
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

	//Actually a new typeDef but I don't know how to do that yet.
	class Track {
		trackPieces: CANNON.Body[] = [];
		negativeYBorder: number = 0;
	}

	//Extends the existing CANNON.World class to make interaction between Three and Cannon easier.
	class ExtendedWorld extends World {
		scene: any;
		populationManager: PopulationManager;
		cannonDebugRenderer: any;
		groundMaterial: CANNON.Material = new CANNON.Material('groundMaterial');
		wheelMaterial: CANNON.Material = new CANNON.Material('wheelMaterial');
		bodyMaterial: CANNON.Material = new CANNON.Material('bodyMaterial');
		carIdCounter: number = 0;
		id: number;
		track: Track = new Track();
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
				//this.populationManager.getRandomCar();
				this.addCar(5, 1, 2);
			}
		}

		//Add a single car according to its passed genome.
		addCar(lengthX: number, lengthY: number, lengthZ: number) {
			let vehicle = new ExtendedRigidVehicle(
				lengthX,
				lengthY,
				lengthZ,
				this.bodyMaterial,
				this.carIdCounter++
			);

			const axisWidth = 4;
			const radius = 2;
			const width = 0.5;

			//Add wheels to the car.
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

			//TODO How to handle 'incorrect' wheels
			// fe wheels that would spawn too far away from the car

			this.populationManager.addCar(vehicle);
			vehicle.addToWorld(this);
		}

		//calculate a step inside the physicsengine and update the visuals for the cars accordingly.
		updatePhysicsWithScene(frameTime: number) {
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
				if (this.render === true) {
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
				collisionFilterGroup: GROUP2,
				collisionFilterMask: GROUP1
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

				//Point to the placement (middle) of the neto be placed track piece
				currentPosition.x = currentPosition.x + xDist;
				currentPosition.y = currentPosition.y + yDist;

				var box = new CANNON.Body({
					mass: 0,
					position: currentPosition,
					collisionFilterGroup: GROUP3,
					collisionFilterMask: GROUP1
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

	//Track a Population of vehicles and their status inside their world.
	class PopulationManager {
		activeCars: Map<number, ExtendedRigidVehicle> = new Map();
		disabledCars: Map<number, ExtendedRigidVehicle> = new Map();
		populationSize: number = 0;

		constructor() {}

		addCar(vehicle: ExtendedRigidVehicle) {
			this.activeCars.set(vehicle.id, vehicle);
			this.populationSize++;
		}

		//Disable the given vehicle and lower the populationSize
		disableCar(car: ExtendedRigidVehicle): boolean {
			if (this.activeCars.delete(car.id)) {
				this.disabledCars.set(car.id, car);
			} else {
				console.log("Tried to remove a car which isn't part of the population");
				return false;
			}
			this.populationSize--;
			return true;
		}

		mutate() {}

		crossOver() {}

		getRandomCar(): number[] {
			//GenerateRandomCar Here

			return [];
		}
	}
</script>

<div class="wrapper">
	<div id="container" />
	<div id="speedometer" />
</div>

<span>GravityInput</span>
<br />
<span>TimeOutTimer</span>
<br />
<span>TrackInput</span>
<br />
<span>TrackPieceLength</span>
<br />
<span>Multiple tracks(?) (Insel-Model)</span>
<br />
<span>CarInput</span>
<br />
<span>CarShowcase(?)</span>
<br />
<span>RestartButton</span>
<br />
<span>FastForward(?)</span>
<br />
<span>Stop FastForward(?)</span>
<br />
<span>StatsDisplay - Graphs of Generations</span>
<br />
<span>Toggle camera control (individual vs following)</span>
<br />
<span>Stop Generation manually (Stuck car not disabling or other problems)</span>

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
