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

        let fitnessDataSelection = this.fitnessData.sort((a, b) => a.fitness - b.fitness);

        let tournamentSelection: number[][] = [];
        let newGeneration: vehicleGenome[] = [];

        fitnessDataSelection.forEach((carA, carAPlacement) => {
            let carBPlacement = Math.floor(Math.random() * fitnessDataSelection.length);
            if (carBPlacement < carAPlacement) {
                tournamentSelection.push(this.toArray(carA.oldVehicleGen));
            } else {
                tournamentSelection.push(this.toArray(fitnessDataSelection[carBPlacement].oldVehicleGen));
            }
        })

        for (let i = 0; i < this.populationSize / 2; i++) {
            let parent1 = tournamentSelection[Math.floor(Math.random() * this.populationSize)];
            let parent2 = tournamentSelection[Math.floor(Math.random() * this.populationSize)];

            let children = this.crossOver(parent1, parent2);
            newGeneration.push(this.toGenome(this.mutate(children[0], mutationRate)));
            newGeneration.push(this.toGenome(this.mutate(children[1], mutationRate)));
        }

        return newGeneration;
    }

    mutate(vehicleGen: number[], mutationRate: number): number[] {
        vehicleGen.forEach((gen, i) => {
            if (Math.random() < mutationRate) {
                vehicleGen[i] = gen + ((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (gen * (Math.random() / 5)));
            }
        });

        //remove random existing wheel
        if (Math.random() < mutationRate) {
            let wheelIndex = Math.floor((Math.random() * (vehicleGen.length - 31) / 7));
            vehicleGen.splice(31 + wheelIndex * 7, 7);
        }

        //add random new wheel
        if (Math.random() < mutationRate) {
            let wheel: number[] = [
                Math.max(1.5, Math.random() * 3), //wheel radius [1.5, 3)
                2.5 - Math.random(), //wheel width (1.5, 2.5]

                //Try to generate wheels which are touching the car
                (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position lengthwise
                (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position height
                (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position width


                10,
                Math.floor(Math.random() * 2),
            ]
            vehicleGen.push(...wheel);
        }

        return vehicleGen;
    }

    crossOver(parent1: number[], parent2: number[]): number[][] {
        let split = Math.floor(Math.random() * parent1.length < parent2.length ? parent1.length : parent2.length);

        let child1: number[] = parent1.slice(0, split);
        child1 = child1.concat(parent2.slice(split));

        let child2: number[] = parent2.slice(0, split);
        child2 = child2.concat(parent1.slice(split));

        return [child1, child2];
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
     * Returns the vehicle genome as an Array for the crossover and mutation process.
     */
    toArray(vehicleGen: vehicleGenome): number[] {
        let genAsArray: number[] = [];
        genAsArray.push(vehicleGen.baseWeight);
        vehicleGen.bodyVectors.forEach(bodyVector => {
            genAsArray.push(bodyVector.x);
            genAsArray.push(bodyVector.y);
            genAsArray.push(bodyVector.z);
            //TODO Material problem
        })
        vehicleGen.wheels.forEach(wheel => {
            genAsArray.push(wheel.canSteer ? 1 : 0);
            genAsArray.push(wheel.radius);
            genAsArray.push(wheel.width);
            genAsArray.push(wheel.density);
            genAsArray.push(wheel.posX);
            genAsArray.push(wheel.posY);
            genAsArray.push(wheel.posZ);
            //TODO Material problem
        })

        return genAsArray;
    }

    /**
     * Returns the vehicle genome as an Array for the crossover and mutation process.
     */
    toGenome(vehicleGen: number[]): vehicleGenome {

        let bodyVectors = [];
        let wheels: wheel[] = [];
        let counter = 1;

        while (counter < 31) {
            bodyVectors.push(new CANNON.Vec3(vehicleGen[counter], vehicleGen[counter + 1], vehicleGen[counter + 2]));
            counter = counter + 3;
        }

        while (counter < vehicleGen.length) {
            let wheel: wheel = {
                canSteer: vehicleGen[counter] >= 1,
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