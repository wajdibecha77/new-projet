import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';
import * as data from '../../../json/stock-prices.json';

@Component({
  selector: 'app-annotations-chart',
  templateUrl: './annotations-chart.component.html',
  styleUrls: ['./annotations-chart.component.scss']
})
export class AnnotationsChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            annotations: {
                yaxis: [
                    {
                        y: 8200,
                        borderColor: '#00E396',
                        label: {
                            borderColor: '#00E396',
                            style: {
                                color: '#fff',
                                background: '#00E396'
                            },
                            text: 'Y Axis Annotation'
                        }
                    }
                ],
                xaxis: [
                    {
                        // in a datetime series, the x value should be a timestamp, just like it is generated below
                        x: new Date('11/17/2017').getTime(),
                        strokeDashArray: 0,
                        borderColor: '#775DD0',
                        label: {
                            borderColor: '#775DD0',
                            style: {
                                color: '#fff',
                                background: '#775DD0'
                            },
                            text: 'X Axis Anno Vertical'
                        }
                    },
                    {
                        x: new Date('03 Dec 2017').getTime(),
                        borderColor: '#FEB019',
                        label: {
                            borderColor: '#FEB019',
                            style: {
                                color: '#fff',
                                background: '#FEB019'
                            },
                            orientation: 'horizontal',
                            text: 'X Axis Anno Horizonal'
                        }
                    }
                ],
                points: [
                    {
                        x: new Date('27 Nov 2017').getTime(),
                        y: 8500.9,
                        marker: {
                            size: 8,
                            fillColor: '#fff',
                            strokeColor: '#2698FF',
                            radius: 2
                        },
                        label: {
                            borderColor: '#FF4560',
                            offsetY: 0,
                            style: {
                                color: '#fff',
                                background: '#FF4560'
                            },
                            text: 'Point Annotation (XY)'
                        }
                    }
                ]
            },
            chart: {
                height: 380,
                type: 'line',
                id: 'areachart-2'
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'straight'
            },
            series: [
                {
                    data: data.monthDataSeries1.prices
                }
            ],
            title: {
                text: 'Line with Annotations',
                align: 'left',
                style: {
                    fontSize: '13px',
                    color: '#666'
                }
            },
            labels: data.monthDataSeries1.dates,
            xaxis: {
                type: 'datetime'
            }
        };

        const chart = new ApexCharts(document.querySelector('#apex-annotations-chart'), options);

        chart.render();
    }

}
