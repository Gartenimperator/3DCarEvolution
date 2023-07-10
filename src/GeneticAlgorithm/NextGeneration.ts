import {vehicleGenome} from "../World/ExtendedWorld";
import {onePartCrossOver, universalCrossover} from "./CrossOver";
import {fitnessData} from "../World/PopulationManager";
import {mutate} from "./Mutate";
import {
    rouletteWheelSelection,
    tournamentSelection
} from "./Selection";

export function createNextGeneration(mutationRate: number, fitnessData: fitnessData[], selectionType: number, crossoverType: number): vehicleGenome[] {
    let newGeneration: vehicleGenome[] = [];
    let populationSize = fitnessData.length;
    let sum = 0;
    let saveElite = true;

    if (selectionType == 1) {
        fitnessData.map(data => sum += data.fitness);
    }

    for (let i = 0; i < Math.ceil(populationSize / 2); i++) {

        let parents: fitnessData[] = [];
        switch (selectionType) {
            case 0: parents = tournamentSelection(fitnessData);
            break;
            case 1: parents = rouletteWheelSelection(fitnessData, sum);
            break;
            default: throw Error("Selectiontype not implemented.");
            break;
        }

        //Json.parse(Json.stringify(obj)) creates deep copy of the vehicleGen
        //This is needed due to the one Elite else the elite might be changed
        let vehGen1 = JSON.parse(JSON.stringify(parents[0].oldVehicleGen));
        let vehGen2 = JSON.parse(JSON.stringify(parents[1].oldVehicleGen));

        //Crossover
        let children: vehicleGenome[] = [];
        switch (crossoverType) {
            case 0: children = onePartCrossOver(vehGen1, vehGen2);
                break;
            case 1: children = universalCrossover(vehGen1, vehGen2);
                break;
            default: throw Error("Selectiontype not implemented.");
                break;
        }
        //Mutation
        newGeneration.push(mutate(children[0], mutationRate));
        newGeneration.push(mutate(children[1], mutationRate));
    }

    if (populationSize % 2 === 1) {
        newGeneration.pop();
    }

    if (saveElite) {
        //ATM only One Elite
        fitnessData = fitnessData.sort((a, b) => a.fitness - b.fitness);

        newGeneration.pop();
        newGeneration.push(fitnessData[fitnessData.length - 1]!.oldVehicleGen);
    }

    return newGeneration;
}