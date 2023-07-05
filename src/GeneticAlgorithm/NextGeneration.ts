import {vehicleGenome} from "../World/ExtendedWorld";
import {twoPartCrossOver} from "./CrossOver";
import {fitnessData} from "../World/PopulationManager";
import {mutate} from "./Mutate";
import {oneRoundTournamentSelection} from "./Selection";

export function createNextGeneration(mutationRate: number, fitnessData: fitnessData[]): vehicleGenome[] {
    let newGeneration: vehicleGenome[] = [];
    let populationSize = fitnessData.length;

    for (let i = 0; i < populationSize / 2; i++) {

        //Selection
        let parent1 = oneRoundTournamentSelection(fitnessData);
        let parent2 = oneRoundTournamentSelection(fitnessData);

        if (populationSize > 2) {
            while (fitnessData.length > 1 && parent1 == parent2) {
                parent2 = oneRoundTournamentSelection(fitnessData);
            }
        }

        //Crossover Json.parse(Json.stringify(obj)) creates deep copy of the vehicleGen
        //This is only needed due to the one Elite else the elite might be changed
        let children = twoPartCrossOver(JSON.parse(JSON.stringify(parent1.oldVehicleGen)), JSON.parse(JSON.stringify(parent2.oldVehicleGen)));

        //Mutation
        newGeneration.push(mutate(children[0], mutationRate));
        newGeneration.push(mutate(children[1], mutationRate));
    }

    if (populationSize % 2 === 1) {
        newGeneration.pop();
    }

    //ATM only One Elite
    fitnessData = fitnessData.sort((a, b) => a.fitness - b.fitness);

    newGeneration.pop();
    newGeneration.push(fitnessData[fitnessData.length - 1]!.oldVehicleGen);

    return newGeneration;
}