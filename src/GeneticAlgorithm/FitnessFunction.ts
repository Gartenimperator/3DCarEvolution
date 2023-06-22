

/**
 * Calculates the fitness value according to the fitness function and the passed parameters.
 * @param stepNumber is the time in steps.
 * @param hasFinished declares if a vehicle has finished.
 * @param distance the vehicle has traveled.
 * @private
 */
export function calculateFitness(stepNumber: number, hasFinished: boolean, distance: number, vehicleMass, wheelMass): number {
    let adjustment = 1 - (1 + wheelMass)/vehicleMass;
    return hasFinished ? (2 * distance + distance * 1000 / stepNumber) : 2 * distance;
}