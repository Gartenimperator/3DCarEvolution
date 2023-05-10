/**
 * Chart.js
 */

import Chart, {ChartData} from "chart.js/auto";
import {fitnessData} from "./PopulationManager";
import {vehicleGenome} from "./ExtendedWorld";

export class DataStore {

    distanceTraveledData: number[][] = [];
    fitnessDataStore: fitnessData[][] = [];

    chart: any;

    constructor() {
        this.newChart();
    }

    pushData(fitnessData: fitnessData[]) {
        let sortedFitnessData = fitnessData.sort((a, b) => b.fitness - a.fitness);
        this.fitnessDataStore.push(sortedFitnessData);

        let median = {
            fitness: 0,
            distanceTraveled: 0,
            hasFinished: false,
            timeInSteps: 0
        };

        let nextGen = this.chart.data.labels[this.chart.data.labels.length - 1] + 1;
        this.chart.data.labels.push(nextGen);

        if (nextGen - 1 === 0) {
            this.chart.data.datasets.push({
                borderColor: 'darkblue'
            });
        }

        sortedFitnessData.forEach((data, i) => {
            if (this.chart.data.datasets[i + 1]) {
                this.chart.data.datasets[i + 1].data.push({
                    x: nextGen - 1,
                    fitnessData: {
                        distanceTraveled: data.distanceTraveled,
                        hasFinished: data.hasFinished,
                        timeInSteps: data.timeInSteps,
                        fitness: data.fitness
                    }
                })
            } else {
                this.chart.data.datasets.push(
                    {
                        data: [{
                            x: nextGen - 1,
                            fitnessData: {
                                distanceTraveled: data.distanceTraveled,
                                hasFinished: data.hasFinished,
                                timeInSteps: data.timeInSteps,
                                fitness: data.fitness
                            },
                        }],
                        borderColor: 'lightblue',
                        parsing: {
                            yAxisKey: 'fitnessData.fitness'
                        },
                    }
                )
            }
            median.fitness = median.fitness + data.fitness;
            median.distanceTraveled = median.distanceTraveled + data.distanceTraveled;
            median.timeInSteps = median.timeInSteps + data.timeInSteps;
        });

        this.chart.update();

        let size = fitnessData.length;
        this.chart.data.datasets[0].data.push({
            x: nextGen - 1,
            fitnessData: {
                distanceTraveled: median.distanceTraveled / size,
                hasFinished: median.hasFinished / size,
                timeInSteps: median.timeInSteps / size,
                fitness: median.fitness / size
            }
        })

        this.chart.update();
    }

    resetData() {
        this.chart.destroy();
        this.newChart();
    }

    newChart() {
        this.chart = new Chart(
            document.getElementById('acquisitions'),
            {
                type: 'line',
                options: {
                    parsing: {
                        xAxisKey: 'x',
                        yAxisKey: 'fitnessData.fitness'
                    },
                    animation: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                title: function (context) {
                                    if (context[0].datasetIndex === 0) {
                                        return 'Median';
                                    } else {
                                        if (context.length > 1) {
                                            return `Place Nr. ${context[0].datasetIndex} to Nr. ${context[0].datasetIndex + context.length - 1}`;
                                        }
                                        return `Place Nr. ${context[0].datasetIndex}`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                text: 'Fitness score',
                                display: true
                            }
                        },
                        x: {
                            title: {
                                text: 'Generations',
                                display: true
                            }
                        }
                    }
                },
            }
        );

        this.chart.data.labels = [0];
    }
}