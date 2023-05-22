import {vehicleGenome} from "../World/ExtendedWorld";
import {twoPartCrossOver} from "./CrossOver";
import {fitnessData} from "../World/PopulationManager";
import {mutate} from "./Mutate";
import {oneRoundTournamentSelection} from "./Selection";

export function createNextGeneration(mutationRate: number, fitnessData: fitnessData[]): vehicleGenome[] {
    let newGeneration: vehicleGenome[] = [];
    let populationSize = fitnessData.length;

    let selection = oneRoundTournamentSelection(fitnessData);
    console.log(selection);

    for (let i = 0; i < populationSize / 2; i++) {
        console.log(Math.floor(Math.random() * populationSize));
        let parent1 = selection[Math.floor(Math.random() * populationSize)];
        let parent2 = selection[Math.floor(Math.random() * populationSize)];

        let children = twoPartCrossOver(parent1, parent2);
        newGeneration.push(mutate(children[0], mutationRate));
        newGeneration.push(mutate(children[1], mutationRate));
    }
    return newGeneration;
}