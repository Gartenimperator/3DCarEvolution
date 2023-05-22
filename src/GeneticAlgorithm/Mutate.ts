import {vehicleGenome} from "../World/ExtendedWorld";
import {createRandomBodyVector, createRandomWheel} from "../VehicleModeling/VehicleGeneration";
import {vehGenConstants} from "../VehicleModeling/VehicleGenerationConstants";

export function mutate(vehicleGen: vehicleGenome, mutationRate: number): vehicleGenome {
    
    function mutate(): boolean {
        return Math.random() < mutationRate;
    }

    let maxMutationValue = 1;
    //increase/decrease random vector variable by up to 1 Meter.
    vehicleGen.bodyVectors.forEach(vector => {
        if (mutate()) {
            vector.x = vector.x + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue;
        }
        if (mutate()) {
            vector.y = vector.y + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue;
        }
        if (mutate()) {
            vector.z = vector.z + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue;
        }
    })

    //increase/decrease random vector variable by up to 50 centimeters.
    vehicleGen.wheels.forEach(wheel => {
        if (mutate()) {
            wheel.radius = Math.max(vehGenConstants.minimalRadius, wheel.radius + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue / 2);
        }
        if (mutate()) {
            wheel.density = Math.min(vehGenConstants.maxDensity, Math.max(vehGenConstants.minDensity, wheel.density + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue / 0.5));
        }
        if (mutate()) {
            wheel.width = Math.max(vehGenConstants.minimalWidth, wheel.width + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue / 2);
        }
        if (mutate()) {
            wheel.stiffness = Math.random();
        }
        if (mutate()) {
            wheel.posX = wheel.posX + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue * 2;
        }
        if (mutate()) {
            wheel.posY = wheel.posY + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue * 2;
        }
        if (mutate()) {
            wheel.posZ = wheel.posZ + (Math.floor((Math.random() * 2)) === 0 ? -1 : 1) * Math.random() * maxMutationValue * 2;
        }
        if (mutate()) {
            wheel.canSteer = !wheel.canSteer;
        }
    })


    //remove random existing bodyVector.
    if (mutate() && vehicleGen.bodyVectors.length > 4) {
        let bodyVectorIndex = Math.floor((Math.random() * vehicleGen.bodyVectors.length));
        vehicleGen.bodyVectors.splice(bodyVectorIndex, 1);
    }

    //add random new bodyVector
    if (mutate()) {
        vehicleGen.bodyVectors.push(createRandomBodyVector());
    }

    //remove random existing wheel
    if (mutate()) {
        let wheelIndex = Math.floor((Math.random() * vehicleGen.wheels.length));
        vehicleGen.wheels.splice(wheelIndex, 1);
    }

    //add random new wheel
    if (mutate() && vehGenConstants.maximumWheels > vehicleGen.wheels.length) {
        vehicleGen.wheels.push(createRandomWheel());
    }
    return vehicleGen;
}
