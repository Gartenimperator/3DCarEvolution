import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {vehicleGenome} from "./ExtendedWorld";
import {createNextGeneration} from "../GeneticAlgorithm/NextGeneration";
import {calculateFitness} from "../GeneticAlgorithm/FitnessFunction";

export type fitnessData = {
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
     * @param trackLength
     */
    disableCar(car: ExtendedRigidVehicle, stepNumber: number, trackLength: number): boolean {
        if (this.activeCars.delete(car.id)) {
            car.disable();
            this.fitnessData.push(
                {
                    oldVehicleGen: car.vehicleGen,
                    distanceTraveled: car.furthestPosition.x,
                    hasFinished: car.hasFinished,
                    timeInSteps: stepNumber,
                    fitness: calculateFitness(stepNumber, car.hasFinished, car.furthestPosition.x, trackLength, car.bodyMass, car.wheelMass),
                }
            )
        } else {
            console.log("Tried to remove a car which isn't part of the population");
            return false;
        }
        return true;
    }

    createNextGeneration(mutationRate: number,
                         selectionType: number,
                         crossoverType: number): vehicleGenome[] {
        return createNextGeneration(mutationRate, this.fitnessData, selectionType, crossoverType);
    }
}