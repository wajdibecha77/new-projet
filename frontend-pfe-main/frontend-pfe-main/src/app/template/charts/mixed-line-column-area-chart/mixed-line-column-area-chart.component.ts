import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-mixed-line-column-area-chart',
  templateUrl: './mixed-line-column-area-chart.component.html',
  styleUrls: ['./mixed-line-column-area-chart.component.scss']
})
export class MixedLineColumnAreaChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 400,
                type: 'line',
                stacked: false,
            },
            stroke: {
                width: [0, 2, 5],
                curve: 'smooth'
            },
            plotOptions: {
                bar: {
                    columnWidth: '50%'
                }
            },
            colors: ['#2962ff', '#00c851', '#ff3547'],
            series: [{
                name: 'Page Views',
                type: 'column',
                data: [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 30, 50]
            }, {
                name: 'New Visitor',
                type: 'area',
                data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43, 50]
            }, {
                name: 'Total Visitor',
                type: 'line',
                data: [30, 25, 36, 30, 45, 35, 64, 52, 59, 36, 39, 50]
            }],
            fill: {
                opacity: [0.85, 0.25, 1],
                gradient: {
                    inverseColors: false,
                    shade: 'light',
                    type: 'vertical',
                    opacityFrom: 0.85,
                    opacityTo: 0.55,
                    stops: [0, 100, 100, 100]
                }
            },
            labels: [
                '01/01/2018',
                '02/01/2018',
                '03/01/2018',
                '04/01/2018',
                '05/01/2018',
                '06/01/2018',
                '07/01/2018',
                '08/01/2018',
                '09/01/2018',
                '10/01/2018',
                '11/01/2018',
                '12/01/2018',
            ],
            markers: {
                size: 0
            },
            xaxis: {
                type: 'datetime'
            },
            yaxis: {
                min: 0
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: {
                    formatter(y: any) {
                        if(typeof y !== 'undefined') {
                            return  y.toFixed(0) + ' views';
                        }
                        return y;
                    }
                }
            },
            legend: {
                offsetY: -10,
                labels: {
                    useSeriesColors: true
                },
                markers: {
                    customHTML: [
                        () => {
                            return '';
                        }, () => {
                            return '';
                        }, () => {
                            return '';
                        }
                    ]
                }
            }
        };
        const chart = new ApexCharts(
            document.querySelector('#apex-mixed-line-column-area-chart'),
            options
        );
        chart.render();
    }

}
