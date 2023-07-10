/**
 * Chart.js
 */

import Chart from "chart.js/auto";
import {fitnessData} from "./World/PopulationManager";
import {roundToFour} from "./VehicleModel/VehicleGeneration";

export class DataStore {
    chart: any;

    constructor() {
        this.newChart();
    }

    pushData(fitnessData: fitnessData[], currentGen: number) {
        let sortedFitnessData = fitnessData.sort((a, b) => b.fitness - a.fitness);

        let median = {
            fitness: 0,
            distanceTraveled: 0,
            hasFinished: false,
            timeInSteps: 0
        };
        let amountOfFinisher = 0;

        this.chart.data.labels.push(currentGen);

        if (currentGen === 1) {
            this.chart.data.datasets.push({
                borderColor: 'darkblue'
            });
        }

        sortedFitnessData.forEach((data, i) => {
            if (this.chart.data.datasets[i + 1]) {
                this.chart.data.datasets[i + 1].data.push({
                    x: currentGen,
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
                            x: currentGen,
                            fitnessData: {
                                distanceTraveled: data.distanceTraveled,
                                hasFinished: data.hasFinished,
                                timeInSteps: data.timeInSteps,
                                fitness: data.fitness
                            },
                        }],
                        borderColor: 'lightblue',
                        borderWidth: 2,
                        parsing: {
                            yAxisKey: 'fitnessData.fitness'
                        },
                    }
                )
            }
            median.fitness = median.fitness + data.fitness;
            median.distanceTraveled = median.distanceTraveled + data.distanceTraveled;
            median.timeInSteps = median.timeInSteps + data.timeInSteps;
            if (data.hasFinished) {
                amountOfFinisher++;
            }
        });

        this.chart.update();

        let size = fitnessData.length;
        this.chart.data.datasets[0].data.push({
            x: currentGen,
            fitnessData: {
                distanceTraveled: median.distanceTraveled / size,
                hasFinished: (amountOfFinisher / size) > 0.5,
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
        this.chart = new Chart(// @ts-ignore
            document.getElementById('fitnessChart')!,
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
                            titleFont: {
                                size: 17
                            },
                            bodyFont: {
                                size: 16
                            },
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
                                },
                                afterLabel: function (context) {
                                    // @ts-ignore
                                    let data = context.dataset.data[context.dataIndex].fitnessData;
                                    let string = `Distance traveled: ${roundToFour(data.distanceTraveled)} meters.`;
                                    if (data.hasFinished) {
                                        string += `\nFinished in ${roundToFour(data.timeInSteps / 60)} seconds :).`;
                                    } else {
                                        string += `\nDied after ${roundToFour(data.timeInSteps / 60)} seconds :(.`;
                                    }
                                    string += `\nAverage speed: ${roundToFour(data.distanceTraveled / (data.timeInSteps / 60))} meters per second.`
                                    return string;
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
    }

    logData() {
        let median: string = "";
        let first: string = "";
        let last: string = "";

        //median
        this.chart.data.datasets[0].data.forEach((data, i) => {
            median += "(" + i + ", " + String(roundToFour(data.fitnessData.fitness)) + "), ";
        })

        //first
        this.chart.data.datasets[1].data.forEach((data, i) => {
            first += "(" + i + ", " + String(roundToFour(data.fitnessData.fitness)) + "), ";
        })

        // last
        this.chart.data.datasets[this.chart.data.datasets.length - 1].data.forEach((data, i) => {
            last += "(" + i + ", " + String(roundToFour(data.fitnessData.fitness)) + "), ";
        })

        console.log("Median: " + median);
        console.log("First: " + first);
        console.log("Last: " + last);
    }
}