/**
 * Calculates the fitness value according to the fitness function and the passed parameters.
 * @param stepNumber is the time in steps.
 * @param hasFinished declares if a vehicle has finished.
 * @param distanceTraveled
 * @param trackLength
 * @param bodyMass the mass of the vehicle body.
 * @param wheelMass
 * @private
 */
export function calculateFitness(stepNumber: number, hasFinished: boolean, distanceTraveled: number, trackLength: number, bodyMass, wheelMass: number): number {
    let relativeDistance = distanceTraveled / trackLength;
    return hasFinished ? 100 + 5 * trackLength * 60 / stepNumber : 100 * relativeDistance + relativeDistance * distanceTraveled * 60 / stepNumber; 
}