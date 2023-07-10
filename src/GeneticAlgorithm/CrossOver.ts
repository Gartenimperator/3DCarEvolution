import {vehicleGenome} from "../World/ExtendedWorld";
import {toGenome, toSplitArray} from "../Utils/VehicleGenArrayHelper";
import {random} from "../Utils/MathHelper";

export function onePartCrossOver(A: vehicleGenome, B: vehicleGenome): vehicleGenome[] {
    let AB = toSplitArray(A);
    let BA = toSplitArray(B);

    for (let i = 0; i < 1; i++) {
        if (random(0,1) > 0.5) {
            let tempAB = AB;
            let temp: [number[], number[]] = OnePartHelper(AB[0], BA[0]);
            AB = [temp[0], BA[1]];
            BA = [temp[1], tempAB[1]];
        } else {
            let temp: [number[], number[]] = OnePartHelper(AB[1], BA[1]);
            AB = [AB[0], temp[0]];
            BA = [BA[0], temp[1]];
        }
    }
    return [toGenome(AB[0].concat(AB[1]), AB[0].length), toGenome(BA[0].concat(BA[1]), BA[0].length)];
}

/**
 *
 * @param parent1
 * @param parent2
 */
function OnePartHelper(parent1: number[], parent2: number[]) {
    let split: number;

    if (parent1.length - parent2.length > 0) {
        split = Math.floor(random(0, parent2.length));
    } else {
        split = Math.floor(random(0, parent1.length));
    }

    let head1 = parent1.slice(0, split);
    let tail1 = parent1.slice(split);

    let head2 = parent2.slice(0, split);
    let tail2 = parent2.slice(split);

    return [head1.concat(tail2), head2.concat(tail1)];
}

export function universalCrossover(A: vehicleGenome, B: vehicleGenome): vehicleGenome[] {
    let AB = toSplitArray(A);
    let BA = toSplitArray(B);

    let bodies = uniformHelper(AB[0], BA[0]);
    let wheels = uniformHelper(AB[1], BA[1]);

    return [toGenome(bodies[0].concat(wheels[0]), bodies[0].length), toGenome(bodies[1].concat(wheels[1]), bodies[1].length)];
}

function uniformHelper(A: number[], B: number[]) {
    let s = 0;
    let t = [];
    let AB = [];
    let BA = [];

    if (A.length <= B.length) {
        s = A.length -1;
        if (A.length < B.length) {
            t = B.slice(s + 1, B.length);
        }
    } else {
        s = B.length -1;
        t = A.slice(s + 1, A.length);
    }

    for (let i = 0; i <= s; i++) {
        if (random(0,1) > 0.5) {
            AB.push(A[i]);
            BA.push(B[i]);
        } else {
            AB.push(B[i]);
            BA.push(A[i]);
        }
    }

    if (random(0, 1) > 0.5) {
        AB = AB.concat(t);
    } else {
        BA = BA.concat(t);
    }

    return [AB, BA];
}
