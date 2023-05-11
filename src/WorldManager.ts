/**
 * Manages the Batches and parallel Worlds.
 */
import {ExtendedWorld, vehicleGenome} from "./ExtendedWorld";
import * as THREE from "three";
import {PopulationManager} from "./PopulationManager";
import {DataStore} from "./DataStore";

export class WorldManager {

    populationStore: Map<number, vehicleGenome[]> = new Map();
    currentGen: number = 1;
    worldIdCounter: number = 0;
    worldAmount: number;
    batchSize: number;
    batchAmount: number;
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
         groundBodyContactMaterialOptions
    ) {
        this.currentWorld?.cleanUpCurrentGeneration(true);

        if (this.currentBatch < this.batchAmount) {
            this.currentBatch++;
        } else {
            this.dataStore.pushData(this.currentPopulationManager.fitnessData, this.currentGen);
            this.populationStore.set(this.worldCounter, this.currentPopulationManager.createNextGeneration(0.05));
            this.currentPopulationManager = new PopulationManager(this.batchSize * (1 + this.batchAmount), this.batchSize);

            this.currentBatch = 0;
            if (this.worldCounter < this.worldAmount) {
                this.worldCounter++;
            } else {
                this.worldCounter = 1;
                this.currentGen++;
            }
        }

        let population = this.populationStore.get(this.worldCounter)?.slice(this.batchSize * this.currentBatch, this.batchSize * this.currentBatch + this.batchSize);

        this.currentWorld = new ExtendedWorld(
            scene,
            worldOptions,
            gravity,
            groundBodyContactMaterialOptions,
            this.worldIdCounter++,
            population ? population : [],
            this.currentPopulationManager,
            true
        );
        console.log(this.currentWorld);
        console.log(this.currentPopulationManager);
        return this.currentWorld;
    }

    reset() {
        this.dataStore.resetData();
        this.populationStore.clear();
        this.currentBatch = -1;
        this.worldCounter = 1;
        this.currentPopulationManager = new PopulationManager(this.batchSize * (1 + this.batchAmount), this.batchSize);
    }
}
