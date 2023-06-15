/**
 * Manages the Batches and parallel Worlds.
 */
import {ExtendedWorld, vehicleGenome} from "./World/ExtendedWorld";
import {PopulationManager} from "./World/PopulationManager";
import {DataStore} from "./DataStore";

export class WorldManager {

    populationStore: Map<number, vehicleGenome[]> = new Map();
    currentGen: number = 1;
    worldIdCounter: number = 0;
    worldAmount: number;

    batchSize: number;
    batchAmount: number;

    lastBatchSize: number;
    lastBatchAmount: number;

    currentBatch: number = -1;
    worldCounter: number = 1;
    currentWorld: ExtendedWorld;
    currentPopulationManager: PopulationManager;

    /**
     * DataStore
     */
    dataStore = new DataStore();

    constructor(amountOfWorlds: number, batchSize: number, batchAmount: number) {
        this.worldAmount = amountOfWorlds;
        this.batchSize = batchSize;
        this.batchAmount = batchAmount - 1; //Zero-indexed.
        this.currentPopulationManager = new PopulationManager(this.batchSize * (1 + this.batchAmount), this.batchSize);
    }

    next(scene,
         worldOptions,
         gravity,
         groundBodyContactMaterialOptions,
         fastForward,
         batchSize,
         amountOfBatches
    ) {
        this.currentWorld?.cleanUpCurrentGeneration(true);

        if (this.currentBatch < this.batchAmount) {
            this.currentBatch++;
        } else {
            this.dataStore.pushData(this.currentPopulationManager.fitnessData, this.currentGen);
            this.populationStore.set(this.worldCounter, this.currentPopulationManager.createNextGeneration(0.05));
            this.lastBatchSize = this.batchSize;
            this.lastBatchAmount = this.batchAmount;
            this.batchSize = batchSize;
            this.batchAmount = amountOfBatches - 1;
            this.currentPopulationManager = new PopulationManager(this.batchSize * (1 + this.batchAmount), this.batchSize);

            this.currentBatch = 0;
            if (this.worldCounter < this.worldAmount) {
                this.worldCounter++;
            } else {
                this.worldCounter = 1;
                this.currentGen++;
            }
        }

        let population = this.populationStore.get(this.worldCounter)?.slice(this.lastBatchSize * this.currentBatch, this.lastBatchSize * this.currentBatch + this.lastBatchSize);

        this.currentWorld = new ExtendedWorld(
            fastForward ? undefined : scene,
            worldOptions,
            gravity,
            groundBodyContactMaterialOptions,
            this.worldIdCounter++,
            population ? population : [],
            this.currentPopulationManager,
            !fastForward
        );
        return this.currentWorld;
    }

    reset(newBatchSize: number | undefined, newAmountOfBatches: number | undefined) {
        this.dataStore.resetData();
        this.populationStore.clear();
        this.currentBatch = -1;
        this.worldCounter = 1;
        this.currentGen = 1;
        if (newBatchSize) {
            this.batchSize = newBatchSize;
        }
        if (newAmountOfBatches) {
            this.batchAmount = newAmountOfBatches - 1;
        }
        this.currentPopulationManager = new PopulationManager(this.batchSize * (1 + this.batchAmount), this.batchSize);
    }
}
