import * as CANNON from "cannon-es";
import {vehicleGenome, wheel} from "../World/ExtendedWorld";
import {vehGenConstants} from "./VehicleGenerationConstants";


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
    let bodyVectorAmount = vehGenConstants.minimumBodyVectors + Math.floor(Math.random() * vehGenConstants.maximumAdditionalBodyVectors);

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
        radius: (roundToFour(vehGenConstants.minimalRadius + Math.random() * vehGenConstants.maximalRadius)), //wheel radius [0.5, 4)
        width: (roundToFour(vehGenConstants.minimalWidth + Math.random() * vehGenConstants.maximalWidth)), //wheel width [0.5, 4)

        //Try to generate wheels which are touching the car
        posX: roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * vehGenConstants.maxWheelPosition), //wheel position lengthwise
        posY: roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * vehGenConstants.maxWheelPosition), //wheel position height
        posZ: roundToFour((Math.floor((Math.random() * 2))) === 0 ? -1 : 1) * (Math.random() * vehGenConstants.maxWheelPosition), //wheel position width

        stiffness: Math.random(),
        density: Math.random() * vehGenConstants.maxDensity + vehGenConstants.minDensity, //density [0.5, 3)
        canSteer: Math.floor(Math.random() * 2) === 1,
    };
}

export function createRandomBodyVector(): CANNON.Vec3 {
    let x = roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * vehGenConstants.maxBodyVectorLength));
    let y = roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * vehGenConstants.maxBodyVectorLength));
    let z = roundToFour((Math.floor(Math.random() * 2) === 0 ? -1 : 1) * (Math.random() * vehGenConstants.maxBodyVectorLength));
    return new CANNON.Vec3(x, y, z);
}



// custom round function
export function roundToFour(num: number) {
    return +(Math.round(num * 10000) / 10000);
}