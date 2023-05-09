import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {vehicleGenome, wheel} from "./ExtendedWorld";
import * as CANNON from "cannon-es";

type fitnessData = {
    id: number,
    oldVehicleGen: vehicleGenome,
    distanceTraveled: number,
    hasFinished: boolean,
    timeInSteps: number,
    fitness: number,
}


/**
 * Track a Population of vehicles and their status inside their world.
 */
export class PopulationManager {
    leadingCar: ExtendedRigidVehicle;
    activeCars: Map<number, ExtendedRigidVehicle> = new Map();
    disabledCars: Map<number, ExtendedRigidVehicle> = new Map();
    fitnessData: fitnessData[] = [];
    populationSize: number = 0;
    mutationRate: number = 0;

    constructor(populationSize: number) {
        //dummy vehicle
        this.leadingCar = new ExtendedRigidVehicle({
            bodyVectors: [],
            baseWeight: 1,
            wheels: []
        }, undefined, undefined, undefined, -1);
        this.leadingCar.chassisBody.position.set(-1, 0, 0);
        this.populationSize = populationSize;
    }

    /**
     * Adds a vehicle to the population and sets it as active.
     * @param vehicle which is added.
     */
    addCar(vehicle: ExtendedRigidVehicle) {
        this.activeCars.set(vehicle.id, vehicle);
    }

    /**
     * Disable the given vehicle and lower the populationSize
     * @param car to disable.
     * @param stepNumber at which the car is disabled.
     */
    disableCar(car: ExtendedRigidVehicle, stepNumber: number): boolean {
        if (this.activeCars.delete(car.id)) {
            car.disable();
            this.fitnessData.push(
                {
                    id: car.id,
                    oldVehicleGen: car.vehicleGen,
                    distanceTraveled: car.furthestPosition.x,
                    hasFinished: car.hasFinished,
                    timeInSteps: stepNumber,
                    fitness: this.calculateFitness(stepNumber, car.hasFinished, car.furthestPosition.x),
                }
            )

            //save disabled cars to dispose of the Cannon and Three objects correctly at the end of the simulation.
            this.disabledCars.set(car.id, car);
        } else {
            console.log("Tried to remove a car which isn't part of the population");
            return false;
        }
        return true;
    }

    createNextGeneration(mutationRate: number): vehicleGenome[] {
        this.mutationRate = mutationRate;

        let tournamentSelection: vehicleGenome[] = [];
        let tournamentSelection2: fitnessData[] = [];
        let newGeneration: vehicleGenome[] = [];

        this.fitnessData.forEach((carA, carAPlacement) => {
            let carBPlacement = Math.floor(Math.random() * this.fitnessData.length);
            if (carBPlacement < carAPlacement) {
                tournamentSelection.push(carA.oldVehicleGen);
                tournamentSelection2.push(carA);
            } else {
                tournamentSelection.push(this.fitnessData[carBPlacement].oldVehicleGen);
                tournamentSelection2.push(this.fitnessData[carBPlacement]);
            }
        });

        console.log(tournamentSelection2.sort((a, b) => a.fitness - b.fitness));

        for (let i = 0; i < this.populationSize / 2; i++) {
            let parent1 = tournamentSelection[Math.floor(Math.random() * this.populationSize)];
            let parent2 = tournamentSelection[Math.floor(Math.random() * this.populationSize)];

            let children = this.crossOver(parent1, parent2);
            newGeneration.push(this.mutateVehicle(children[0]));
            newGeneration.push(this.mutateVehicle(children[1]));
        }
        return newGeneration;
    }

    mutateVehicle(vehicleGen: vehicleGenome): vehicleGenome {

        //increase/decrease base weight by up to 10 percent.
        if (this.mutate()) {
            vehicleGen.baseWeight = vehicleGen.baseWeight * (1 + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() / 10);
        }

        let baseMutationPosition = 0.5;
        //increase/decrease random vector variable by up to 50 centimeters.
        vehicleGen.bodyVectors.forEach(vector => {
            if (this.mutate()) {
                vector.x = vector.x + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * baseMutationPosition;
            }
            if (this.mutate()) {
                vector.y = vector.y + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * baseMutationPosition;
            }
            if (this.mutate()) {
                vector.z = vector.z + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * baseMutationPosition;
            }
        })

        //increase/decrease random vector variable by up to 10 percent.
        vehicleGen.wheels.forEach(wheel => {
            if (this.mutate()) {
                wheel.radius = wheel.radius + + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * 0.3;
            }
            if (this.mutate()) {
                wheel.density = wheel.density + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * 2;
            }
            if (this.mutate()) {
                wheel.width = wheel.width + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * 0.3;
            }
            if (this.mutate()) {
                wheel.posX = wheel.posX + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * baseMutationPosition;
            }
            if (this.mutate()) {
                wheel.posY = wheel.posY + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * baseMutationPosition;
            }
            if (this.mutate()) {
                wheel.posZ = wheel.posZ + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * baseMutationPosition;
            }
            if (this.mutate()) {
                wheel.canSteer = !wheel.canSteer;
            }
        })


        //remove random existing bodyVector.
        if (this.mutate() && vehicleGen.bodyVectors.length > 4) {
            let bodyVectorIndex = Math.floor((Math.random() * vehicleGen.bodyVectors.length));
            vehicleGen.bodyVectors.splice(bodyVectorIndex, 1);
        }

        //add random new bodyVector
        if (this.mutate()) {
            let x = (Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6);
            let y = (Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6);
            let z = (Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6);
            vehicleGen.bodyVectors.push(new CANNON.Vec3(x, y, z));
        }

        //remove random existing wheel
        if (this.mutate()) {
            let wheelIndex = Math.floor((Math.random() * vehicleGen.wheels.length));
            vehicleGen.wheels.splice(wheelIndex, 1);
        }

        //add random new wheel
        if (this.mutate()) {
            let wheel: wheel = {
                radius: Math.max(1.5, Math.random() * 3), //wheel radius [1.5, 3)
                width: 2.5 - Math.random(), //wheel width (1.5, 2.5]

                posX: (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position lengthwise
                posY: (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position height
                posZ: (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position width

                density: 10,
                canSteer: Math.floor(Math.random() * 2) === 0
            }
            vehicleGen.wheels.push(wheel);
        }
        return vehicleGen;
    }

    mutate(): boolean {
        return Math.random() < this.mutationRate;
    }

    crossOver(parent1: vehicleGenome, parent2: vehicleGenome): vehicleGenome[] {

        let parent1Arr = this.toSplitArray(parent1);
        let parent2Arr = this.toSplitArray(parent2);

        let bodies = this.splitCrossOverHelper(parent1Arr[0], parent2Arr[0]);
        let wheels = this.splitCrossOverHelper(parent1Arr[1], parent2Arr[1]);

        let child1 = bodies[0].concat(wheels[0]);
        let child2 = bodies[1].concat(wheels[1]);
        return [this.toGenome(child1, bodies[0].length), this.toGenome(child2, bodies[1].length)];
    }

    splitCrossOverHelper(parent1: number[], parent2: number[]) {
        let firstSplit = 0;

        if (parent1.length - parent2.length > 0) {
            firstSplit = Math.floor(Math.random() * parent2.length);
        } else {
            firstSplit = Math.floor(Math.random() * parent1.length);
        }

        let head1 = parent1.slice(0, firstSplit);
        let tail1 = parent1.slice(firstSplit);

        let head2 = parent2.slice(0, firstSplit);
        let tail2 = parent2.slice(firstSplit);

        return [head1.concat(tail2), head2.concat(tail1)];
    }

    /**
     * Calculates the fitness value according to the fitness function and the passed parameters.
     * @param stepNumber is the time in steps.
     * @param hasFinished declares if a vehicle has finished.
     * @param distance the vehicle has traveled.
     * @private
     */
    private calculateFitness(stepNumber: number, hasFinished: boolean, distance: number): number {
        return distance + (hasFinished ? 100 : 0);
    }

    /**
     * Returns the given vehicleGenome as an Array. Creates dummyVectors if needed.
     * @param vehicleGen
     * @param amountOfDummyVectors
     */
    toSplitArray(vehicleGen: vehicleGenome): number[][] {
        let bodyAsArray: number[] = [];
        bodyAsArray.push(vehicleGen.baseWeight);
        for (let i = 0; i < vehicleGen.bodyVectors.length; i++) {
            bodyAsArray.push(vehicleGen.bodyVectors[i].x);
            bodyAsArray.push(vehicleGen.bodyVectors[i].y);
            bodyAsArray.push(vehicleGen.bodyVectors[i].z);
        }

        let wheelAsArray: number[] = [];
        vehicleGen.wheels.forEach(wheel => {
            wheelAsArray.push(wheel.canSteer ? 1 : 0)
            wheelAsArray.push(wheel.radius);
            wheelAsArray.push(wheel.width);
            wheelAsArray.push(wheel.density);
            wheelAsArray.push(wheel.posX);
            wheelAsArray.push(wheel.posY);
            wheelAsArray.push(wheel.posZ);
        })

        return [bodyAsArray, wheelAsArray];
    }

    /**
     * Returns the vehicle genome as an Array for the crossover and mutation process.
     */
    toGenome(vehicleGen: number[], amountOfBodyVectors: number): vehicleGenome {

        let bodyVectors = [];
        let wheels: wheel[] = [];
        let counter = 1;

        //TODO insert error here if mod 3 != 0

        while (counter < amountOfBodyVectors) {
            bodyVectors.push(new CANNON.Vec3(vehicleGen[counter], vehicleGen[counter + 1], vehicleGen[counter + 2]));
            counter = counter + 3;
        }

        //TODO insert error here if mod 7 != 0
        while (counter < vehicleGen.length) {
            let wheel: wheel = {
                canSteer: vehicleGen[counter] === 1,
                radius: vehicleGen[counter + 1],
                width: vehicleGen[counter + 2],
                density: vehicleGen[counter + 3],
                posX: vehicleGen[counter + 4],
                posY: vehicleGen[counter + 5],
                posZ: vehicleGen[counter + 6]
            };
            wheels.push(wheel);
            counter = counter + 7;
        }

        return {
            baseWeight: vehicleGen[0],
            bodyVectors: bodyVectors,
            wheels: wheels
        };
    }
}