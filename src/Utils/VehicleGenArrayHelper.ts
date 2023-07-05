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
        wheelAsArray.push(wheel.radius);
        wheelAsArray.push(wheel.width);
        wheelAsArray.push(wheel.density);
        wheelAsArray.push(wheel.stiffness);
        wheelAsArray.push(wheel.posX);
        wheelAsArray.push(wheel.posY);
        wheelAsArray.push(wheel.posZ);
        wheelAsArray.push(wheel.canSteer ? 1 : 0);
    })

    return [bodyAsArray, wheelAsArray];
}

/**
 * Returns the vehicle genome as an Array for the crossover and mutation process.
 */
export function toGenome(vehicleGen: number[], amountOfBodyVectors: number): vehicleGenome {
    let bodyVectors: CANNON.Vec3[] = [];
    let wheels: wheel[] = [];
    let counter = 0;

    if (amountOfBodyVectors % 3 != 0) {
        console.log("Incorrect amount of Bodyvectors during the crossover");
    }

    while (counter < amountOfBodyVectors) {
        bodyVectors.push(new CANNON.Vec3(vehicleGen[counter], vehicleGen[counter + 1], vehicleGen[counter + 2]));
        counter = counter + 3;
    }

    if ((vehicleGen.length - counter) % 8 != 0) {
        console.log("Incorrect amount of Wheelvectors during the crossover");
    }

    while (counter < vehicleGen.length) {
        let wheel: wheel = {
            radius: vehicleGen[counter],
            width: vehicleGen[counter + 1],
            density: vehicleGen[counter + 2],
            stiffness: vehicleGen[counter + 3],
            posX: vehicleGen[counter + 4],
            posY: vehicleGen[counter + 5],
            posZ: vehicleGen[counter + 6],
            canSteer: vehicleGen[counter + 7] === 1,
        };
        wheels.push(wheel);
        counter = counter + 8;
    }

    return {
        bodyVectors: bodyVectors,
        wheels: wheels
    };
}

export function toNumberArray(bodyVectors: CANNON.Vec3[]) {
    let vertices: number[][] = [];

    //Convert the CANNON.Vec3 vectors to a number [[]] array with the same order.
    bodyVectors.forEach(bodyVector => {
        let vector: number[] = [];
        vector.push(bodyVector.x);
        vector.push(bodyVector.y);
        vector.push(bodyVector.z);
        vertices.push(vector);
    })
    return vertices;
}