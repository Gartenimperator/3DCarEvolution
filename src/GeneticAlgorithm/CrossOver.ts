import {vehicleGenome} from "../World/ExtendedWorld";
import {toGenome, toSplitArray} from "../Utils/VehicleGenArrayHelper";

export function twoPartCrossOver(parent1: vehicleGenome, parent2: vehicleGenome): vehicleGenome[] {
    let parent1Arr = toSplitArray(parent1);
    let parent2Arr = toSplitArray(parent2);

    let bodies = twoPartCrossOverHelper(parent1Arr[0], parent2Arr[0]);
    let wheels = twoPartCrossOverHelper(parent1Arr[1], parent2Arr[1]);

    let child1 = bodies[0].concat(wheels[0]);
    let child2 = bodies[1].concat(wheels[1]);
    return [toGenome(child1, bodies[0].length), toGenome(child2, bodies[1].length)];
}

/**
 *
 * @param parent1
 * @param parent2
 */
function twoPartCrossOverHelper(parent1: number[], parent2: number[]) {
    let firstSplit: number;

    if (parent1.length - parent2.length > 0) {
        firstSplit = Math.floor(Math.random() * parent2.length);
    } else {
        firstSplit = Math.floor(Math.random() * parent1.length);
    }

    let head1 = parent1.slice(0, firstSplit);
    let tail1 = parent1.slice(firstSplit);

    let head2 = parent2.slice(0, firstSplit);
    let tail2 = parent2.slice(firstSplit);

    return [head1.concat(tail2), head2.concat(tail1)];
}
