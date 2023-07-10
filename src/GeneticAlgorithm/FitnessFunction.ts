/**
 * Calculates the fitness value according to the fitness function and the passed parameters.
 * @param stepNumber is the time in steps.
 * @param hasFinished declares if a vehicle has finished.
 * @param distance the vehicle has traveled.
 * @param bodyMass the mass of the vehicle body.
 * @param wheelMass
 * @private
 */
export function calculateFitness(stepNumber: number, hasFinished: boolean, distance: number, bodyMass, wheelMass: number): number {
    return hasFinished ? (distance + distance * 600 / stepNumber) + (bodyMass - wheelMass) / 100 : distance + distance * 60 / stepNumber;
}