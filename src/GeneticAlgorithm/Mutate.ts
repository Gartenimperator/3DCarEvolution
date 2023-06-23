import {vehicleGenome} from "../World/ExtendedWorld";
import {createRandomBodyVector, createRandomWheel} from "../VehicleModel/VehicleGeneration";
import {vehGenConstants} from "../VehicleModel/VehicleGenerationConstants";
import {random} from "../Utils/MathHelper";

export function mutate(vehicleGen: vehicleGenome, mutationRate: number): vehicleGenome {
    
    function mutate(): boolean {
        return Math.random() < mutationRate;
    }

    let maxMutationValue = 2;
    //increase/decrease random vector variable by up to 1 Meter.
    vehicleGen.bodyVectors.forEach(vector => {
        if (mutate()) {
            vector.x = vector.x + random(-1, 1) * maxMutationValue;
        }
        if (mutate()) {
            vector.y = vector.y + random(-1, 1) * maxMutationValue;
        }
        if (mutate()) {
            vector.z = vector.z + random(-1, 1) * maxMutationValue;
        }
    })

    //increase/decrease random vector variable by up to 50 centimeters.
    vehicleGen.wheels.forEach(wheel => {
        if (mutate()) {
            wheel.radius = Math.max(vehGenConstants.minimalRadius, wheel.radius + random(-1, 1) * maxMutationValue / 2);
        }
        if (mutate()) {
            wheel.density = Math.min(vehGenConstants.maxDensity, Math.max(vehGenConstants.minDensity, wheel.density + random(-1, 1) * maxMutationValue / 0.5));
        }
        if (mutate()) {
            wheel.width = Math.max(vehGenConstants.minimalWidth, wheel.width + random(-1, 1) * maxMutationValue / 2);
        }
        if (mutate()) {
            wheel.stiffness = Math.random();
        }
        if (mutate()) {
            wheel.posX = random(-1, 1);
        }
        if (mutate()) {
            wheel.posY = random(-1, 1);
        }
        if (mutate()) {
            wheel.posZ = random(-1, 1);
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
