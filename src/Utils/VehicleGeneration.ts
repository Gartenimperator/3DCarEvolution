import CANNON from "cannon-es";
import {vehicleGenome, wheel} from "../ExtendedWorld";


/**
 * Generates a new random vehicle. This vehicle hax a maximum length of 5 and a maximum width/height of 2 meters.
 * The amount, placement and size of wheels is also randomly generated. The wheel radius and width have a maximum size of 1 meter.
 * The wheel position is generated according to the size of the vehicle body, so that the wheels center has to always touch the body.
 */
export function createRandomCar(): vehicleGenome {
    //GenerateRandomCar Here
    var vehicle: vehicleGenome = {
        baseWeight: 10 + this.roundToFour(Math.random() * 200), //base weigth - influences the cars calculated weight and its engine power
        bodyVectors: [],
        wheels: []
    };

    //Minimum 4 vectors.
    var bodyVectorAmount = 4 + Math.floor(Math.random() * 8);

    for (let i = 0; i < bodyVectorAmount; i++) {
        vehicle.bodyVectors.push(createRandomBodyVector());
    }

    var wheelAmount = Math.floor(Math.random() * 10);

    for (let j = 0; j < wheelAmount; j++) {
        vehicle.wheels.push(createRandomWheel());
    }
    return vehicle;
}

export function createRandomWheel(): wheel {
    return {
        radius: (this.roundToFour(Math.max(1, Math.random() * 3))), //wheel radius [1.5, 3)
        width: (this.roundToFour(2.5 - Math.random())), //wheel width (1.5, 2.5]

        //Try to generate wheels which are touching the car
        posX: this.roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position lengthwise
        posY: this.roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position height
        posZ: this.roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * 3), //wheel position width


        density: Math.ceil(Math.random() * 5),
        canSteer: Math.floor(Math.random() * 2) === 1,
    };
}

export function createRandomBodyVector(): CANNON.Vec3 {
    let x = this.roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6));
    let y = this.roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6));
    let z = this.roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * 6));
    return new CANNON.Vec3(x, y, z);
}