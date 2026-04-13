import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-mixed-multiple-y-axis',
  templateUrl: './mixed-multiple-y-axis.component.html',
  styleUrls: ['./mixed-multiple-y-axis.component.scss']
})
export class MixedMultipleYAxisComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 400,
                type: 'line',
                stacked: false
            },
            dataLabels: {
                enabled: false
            },
            series: [{
                name: 'Income',
                type: 'column',
                data: [1.4, 2, 2.5, 1.5, 2.5, 2.8, 3.8, 4.6]
            }, {
                name: 'Cashflow',
                type: 'column',
                data: [1.1, 3, 3.1, 4, 4.1, 4.9, 6.5, 8.5]
            }, {
                name: 'Revenue',
                type: 'line',
                data: [20, 29, 37, 36, 44, 45, 50, 58]
            }],
            stroke: {
                width: [1, 1, 4]
            },
            title: {
                text: 'XYZ - Stock Analysis (2012 - 2019)',
                align: 'left',
                offsetX: 50
            },
            xaxis: {
                categories: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019],
            },
            yaxis: [
            {
                axisTicks: {
                    show: true,
                },
                axisBorder: {
                    show: true,
                    color: '#008FFB'
                },
                labels: {
                    style: {
                        color: '#008FFB',
                    }
                },
                title: {
                    text: 'Income (thousand crores)',
                    style: {
                        color: '#008FFB',
                    }
                },
                tooltip: {
                    enabled: true
                }
            },
            {
                seriesName: 'Income',
                opposite: true,
                axisTicks: {
                    show: true,
                },
                axisBorder: {
                    show: true,
                    color: '#00E396'
                },
                labels: {
                    style: {
                        color: '#00E396',
                    }
                },
                title: {
                    text: 'Operating Cashflow (thousand crores)',
                    style: {
                        color: '#00E396',
                    }
                },
            },
            {
                seriesName: 'Revenue',
                opposite: true,
                axisTicks: {
                    show: true,
                },
                axisBorder: {
                    show: true,
                    color: '#FEB019'
                },
                labels: {
                    style: {
                        color: '#FEB019',
                    },
                },
                title: {
                    text: 'Revenue (thousand crores)',
                    style: {
                        color: '#FEB019',
                    }
                }
            },
            ],
            tooltip: {
                fixed: {
                    enabled: true,
                    position: 'topLeft', // topRight, topLeft, bottomRight, bottomLeft
                    offsetY: 30,
                    offsetX: 60
                },
            },
            legend: {
                horizontalAlign: 'left',
                offsetX: 30,
                offsetY: -10,
            }
        };
        const chart = new ApexCharts(
            document.querySelector('#apex-mixed-multiple-y-axis-charts'),
            options
        );
        chart.render();
    }

}
