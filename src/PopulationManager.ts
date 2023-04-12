import {ExtendedRigidVehicle} from "./ExtendedRigidVehicle";
import {vehicleGenome, wheel} from "./ExtendedWorld";

//Track a Population of vehicles and their status inside their world.
export class PopulationManager {
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

    /**
     * Generates a new random vehicle. This vehicle hax a maximum length of 5 and a maximum width/height of 2 meters.
     * The amout, placement and size of wheels is also randomly generated. The wheel radius and width have a maximum size of 1 meter.
     * The wheel position is generated according to the size of the vehicle body, so that the wheels center has to always touch the body.
     */
    getRandomCar(): vehicleGenome {
        //GenerateRandomCar Here
        var vehicle: vehicleGenome = {
            baseWeight: (this.roundToFour(Math.random() * 50)), //base weigth - influences the cars calculated weight and its engine power
            length: (this.roundToFour(Math.random() * 7)),
            height: (this.roundToFour(Math.random() * 2)),
            width: (this.roundToFour(Math.random() * 5)),
            wheels: []
        };

        var wheelAmount = Math.floor(Math.random() * 5);

        for (var i = 0; i < wheelAmount; i++) {
            var wheel: wheel = {
                radius: (this.roundToFour(Math.max(1.5, Math.random() * 3))), //wheel radius [1.5, 3)
                width: (this.roundToFour(2.5 - Math.random())), //wheel width (1.5, 2.5]

                //Try to generate wheels which are touching the car
                posX: (this.roundToFour(-vehicle.length + vehicle.length * Math.random() * 2)), //wheel position lengthwise
                posY: (this.roundToFour(-vehicle.height + vehicle.height * Math.random() * 2)), //wheel position height
                posZ: (this.roundToFour(-vehicle.width + vehicle.width * Math.random() * 2)) //wheel position width
            };
            vehicle.wheels.push(wheel);
        }

        return vehicle;
    }

    // custom round function
    roundToFour(num: number) {
        return +(Math.round(num * 10000) / 10000);
    }
}