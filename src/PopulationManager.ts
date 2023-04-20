import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";

/**
 * Track a Population of vehicles and their status inside their world.
 */
export class PopulationManager {
    leadingCar: ExtendedRigidVehicle;
    activeCars: Map<number, ExtendedRigidVehicle> = new Map();
    disabledCars: Map<number, ExtendedRigidVehicle> = new Map();
    populationSize: number = 0;

    constructor(populationSize: number) {
        //dummy vehicle
        this.leadingCar = new ExtendedRigidVehicle( {
            width: 1,
            length: 1,
            height: 1,
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
     */
    disableCar(car: ExtendedRigidVehicle): boolean {
        if (this.activeCars.delete(car.id)) {
            car.disable();
            this.disabledCars.set(car.id, car);
        } else {
            console.log("Tried to remove a car which isn't part of the population");
            return false;
        }
        return true;
    }

    mutate() {}

    crossOver() {}

}