import * as CANNON from "cannon-es";
import {vehicleGenome, wheel} from "../World/ExtendedWorld";
import {vehGenConstants} from "./VehicleGenerationConstants";
import {random} from "../Utils/MathHelper";


/**
 * Generates a new random vehicle. This vehicle hax a maximum length of 5 and a maximum width/height of 2 meters.
 * The amount, placement and size of wheels is also randomly generated. The wheel radius and width have a maximum size of 1 meter.
 * The wheel position is generated according to the size of the vehicle body, so that the wheels center has to always touch the body.
 */
export function createRandomCar(): vehicleGenome {
    //GenerateRandomCar Here
    let vehicle: vehicleGenome = {
        bodyVectors: [],
        wheels: []
    };

    //Minimum 4 vectors.
    let bodyVectorAmount = Math.floor(random(vehGenConstants.minimumBodyVectors, vehGenConstants.maximumBodyVectors));

    for (let i = 0; i < bodyVectorAmount; i++) {
        vehicle.bodyVectors.push(createRandomBodyVector());
    }

    let wheelAmount = Math.floor(Math.random() * vehGenConstants.maximumWheels);

    for (let j = 0; j < wheelAmount; j++) {
        vehicle.wheels.push(createRandomWheel());
    }

    return vehicle;
}

export function createRandomWheel(): wheel {
    return {
        radius: random(vehGenConstants.minimalRadius, vehGenConstants.maximalRadius),
        width: random(vehGenConstants.minimalWidth, vehGenConstants.maximalWidth),

        posX: random(-1, 1), //wheel position length
        posY: random(-1, 1), //wheel position height
        posZ: random(-1, 1), //wheel position width

        stiffness: Math.random(),
        density: random(vehGenConstants.maxDensity, vehGenConstants.minDensity),
        canSteer: Math.floor(Math.random() * 2) === 1,
    };
}

export function createRandomBodyVector(): CANNON.Vec3 {
    let x = random(-vehGenConstants.maxBodyVectorLength, vehGenConstants.maxBodyVectorLength);
    let y = random(-vehGenConstants.maxBodyVectorLength, vehGenConstants.maxBodyVectorLength);
    let z = random(-vehGenConstants.maxBodyVectorLength, vehGenConstants.maxBodyVectorLength);
    return new CANNON.Vec3(x, y, z);
}



// custom round function
export function roundToFour(num: number) {
    return +(Math.round(num * 10000) / 10000);
}