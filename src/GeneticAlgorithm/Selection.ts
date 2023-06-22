import {vehicleGenome} from "../World/ExtendedWorld";
import {fitnessData} from "../World/PopulationManager";

export function oneRoundTournamentSelection(fitnessData: fitnessData[]): fitnessData {
    let carA = fitnessData[Math.floor(Math.random() * fitnessData.length)];
    let carB = fitnessData[Math.floor(Math.random() * fitnessData.length)];

    while (carA == carB) {
        carB = fitnessData[Math.floor(Math.random() * fitnessData.length)];
    }

    if (carA.fitness > carB.fitness) {
        return carA;
    } else {
        return carB;
    }
}