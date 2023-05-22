import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {vehicleGenome} from "./ExtendedWorld";
import {createNextGeneration} from "../GeneticAlgorithm/NextGeneration";

export type fitnessData = {
    id: number,
    oldVehicleGen?: vehicleGenome,
    distanceTraveled: number,
    hasFinished: boolean,
    timeInSteps: number,
    fitness: number,
}


/**
 * Track a Population of vehicles and their status inside their world.
 */
export class PopulationManager {
    activeCars: Map<number, ExtendedRigidVehicle> = new Map();
    fitnessData: fitnessData[] = [];
    populationSize: number = 0;
    batchSize: number = 0;

    constructor(populationSize: number, batchSize: number) {
        this.populationSize = populationSize;
        this.batchSize = batchSize;
    }

    /**
     * Adds a vehicle to the population and sets it as active.
     * @param vehicle which is added.
     */
    addCar(vehicle: ExtendedRigidVehicle) {
        this.activeCars.set(vehicle.id, vehicle);
    }

    /**
     * Disable the given vehicle.
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
                    fitness: PopulationManager.calculateFitness(stepNumber, car.hasFinished, car.furthestPosition.x),
                }
            )
        } else {
            console.log("Tried to remove a car which isn't part of the population");
            return false;
        }
        return true;
    }

    createNextGeneration(mutationRate: number): vehicleGenome[] {
        return createNextGeneration(mutationRate, this.fitnessData);
    }

    /**
     * Calculates the fitness value according to the fitness function and the passed parameters.
     * @param stepNumber is the time in steps.
     * @param hasFinished declares if a vehicle has finished.
     * @param distance the vehicle has traveled.
     * @private
     */
    private static calculateFitness(stepNumber: number, hasFinished: boolean, distance: number): number {
        return hasFinished ? distance + distance * 1000 / stepNumber : distance;
    }
}