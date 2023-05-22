import {vehicleGenome} from "../World/ExtendedWorld";
import {fitnessData} from "../World/PopulationManager";

export function oneRoundTournamentSelection(fitnessData: fitnessData[]) {
    let tournamentSelection: vehicleGenome[] = [];

    fitnessData.forEach((carA) => {
        let carBPlacement = Math.floor(Math.random() * fitnessData.length);
        if (carA.fitness > fitnessData[carBPlacement].fitness) {
            if (carA.oldVehicleGen) {
                tournamentSelection.push(carA.oldVehicleGen);
            }
        } else {
            tournamentSelection.push(fitnessData[carBPlacement].oldVehicleGen);
        }
    });

    return tournamentSelection;
}