import {fitnessData} from "../World/PopulationManager";
import {random} from "../Utils/MathHelper";

export function tournamentSelection(fitnessData: fitnessData[]): fitnessData[] {
    let parent1 = tournamentSelectionHelper(fitnessData, 2);
    let parent2 = tournamentSelectionHelper(fitnessData, 2);

    while (fitnessData.length > 1 && parent1 == parent2) {
        parent2 = tournamentSelectionHelper(fitnessData, 1);
    }

    return [parent1, parent2];
}

export function tournamentSelectionHelper(fitnessData: fitnessData[], size: number): fitnessData {

    if (size > 0) {
        let carA = tournamentSelectionHelper(fitnessData, size - 1);
        let carB = tournamentSelectionHelper(fitnessData, size - 1);

        if (carA.fitness > carB.fitness) {
            return carA;
        } else {
            return carB;
        }
    } else {
        return fitnessData[Math.floor(Math.random() * fitnessData.length)];
    }
}

export function rouletteWheelSelection(fitnessData: fitnessData[], fitnessSum: number): fitnessData[] {
    let parent1 = rouletteSelectionHelper(fitnessData, fitnessSum);
    let parent2 = rouletteSelectionHelper(fitnessData, fitnessSum);

    while (fitnessData.length > 1 && parent1 == parent2) {

        let temp = fitnessData.filter(item => item !== parent2);
        parent2 = rouletteSelectionHelper(temp, fitnessSum - parent2.fitness);
    }

    return [parent1, parent2];
}

export function rouletteSelectionHelper(fitnessData: fitnessData[], fitnessSum: number): fitnessData {
    let selector = random(0, fitnessSum);
    let sum = 0;

    for (let i = 0; i < fitnessData.length; i++) {
        sum += fitnessData[i].fitness;
        if (selector < sum) {
            return fitnessData[i];
        }
    }
    return fitnessData[random(0, fitnessData.length - 1)];
}