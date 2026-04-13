import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-mixed-line-area-charts',
  templateUrl: './mixed-line-area-charts.component.html',
  styleUrls: ['./mixed-line-area-charts.component.scss']
})
export class MixedLineAreaChartsComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 400,
                type: 'line',
            },
            stroke: {
                curve: 'smooth'
            },
            series: [{
                name: 'New Visitor',
                type: 'area',
                data: [44, 55, 31, 47, 31, 43, 26, 41, 31, 47, 33, 44, 55, 31, 60,]
            }, {
                name: 'Total Visitor',
                type: 'line',
                data: [55, 69, 45, 61, 43, 54, 37, 52, 44, 61, 43, 55, 69, 45, 70]
            }],
            fill: {
                type:'solid',
                opacity: [0.35, 1],
            },
            labels: [
                'Oct 01', 'Oct 02', 'Oct 03', 'Oct 04', 'Oct 05',
                'Oct 06', 'Oct 07', 'Oct 08', 'Oct 09 ', 'Oct 10',
                'Oct 11', 'Oct 12', 'Oct 13', 'Oct 14', 'Oct 15'
            ],
            markers: {
                size: 0
            },
            yaxis: [
                {
                    title: {
                        text: 'New Visitor',
                    },
                },
                {
                    opposite: true,
                    title: {
                        text: 'Total Visitor',
                    },
                },
            ],
            tooltip: {
                shared: true,
                intersect: false,
                y: {
                    formatter(y) {
                        if(typeof y !== 'undefined') {
                            return  y.toFixed(0) + ' points';
                        }
                        return y;
                    }
                }
            },
            legend: {
                offsetY: -10,
            }
        };
        const chart = new ApexCharts(
            document.querySelector('#apex-mixed-line-area-charts'),
            options
        );
        chart.render();
    }

}
