import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {vehicleGenome} from "./ExtendedWorld";

type fitnessData = {
    id: number,
    vehicleGen: vehicleGenome,
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
        this.leadingCar = new ExtendedRigidVehicle( {
            bodyVectors: [],
            baseWeight: 1,
            wheels: []
        },  undefined, undefined, -1);
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
                    vehicleGen: car.vehicleGen,
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

    createNextGeneration(): fitnessData[] {
        //TODO Selection, cross-over and mutation
        return this.fitnessData.sort((a,b) => a.fitness - b.fitness);
    }

    mutate() {}

    crossOver(parent1: vehicleGenome, parent2: vehicleGenome) {
        let childA: vehicleGenome;
        let childB: vehicleGenome;
    }

    /**
     * Calculates the fitness value according to the fitness function and the passed parameters.
     * @param stepNumber is the time in steps.
     * @param hasFinished declares if a vehicle has finished.
     * @param distance the vehicle has traveled.
     * @private
     */
    private calculateFitness(stepNumber: number, hasFinished: boolean, distance: number): number {
        return distance;
    }
}