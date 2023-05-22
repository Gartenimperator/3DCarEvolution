import {vehicleGenome, wheel} from "../World/ExtendedWorld";
import * as CANNON from "cannon-es";

/**
 * Returns the given vehicleGenome as an Array.
 * @param vehicleGen
 */
export function toSplitArray(vehicleGen: vehicleGenome): number[][] {
    let bodyAsArray: number[] = [];
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
        wheelAsArray.push(wheel.stiffness);
        wheelAsArray.push(wheel.posX);
        wheelAsArray.push(wheel.posY);
        wheelAsArray.push(wheel.posZ);
    })

    return [bodyAsArray, wheelAsArray];
}

/**
 * Returns the vehicle genome as an Array for the crossover and mutation process.
 */
export function toGenome(vehicleGen: number[], amountOfBodyVectors: number): vehicleGenome {
    let bodyVectors = [];
    let wheels: wheel[] = [];
    let counter = 0;

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
            stiffness: vehicleGen[counter + 4],
            posX: vehicleGen[counter + 5],
            posY: vehicleGen[counter + 6],
            posZ: vehicleGen[counter + 7]
        };
        wheels.push(wheel);
        counter = counter + 8;
    }

    return {
        bodyVectors: bodyVectors,
        wheels: wheels
    };
}