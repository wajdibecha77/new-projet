import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-spline-area-chart',
  templateUrl: './spline-area-chart.component.html',
  styleUrls: ['./spline-area-chart.component.scss']
})

export class SplineAreaChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 350,
                type: 'area',
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth'
            },
            series: [{
                name: 'New Sales',
                data: [31, 40, 28, 51, 42, 109, 100]
            }, {
                name: 'Existing Sales',
                data: [11, 32, 45, 32, 34, 52, 41]
            }],
            xaxis: {
                type: 'datetime',
                categories: [
                    '2018-09-19T00:00:00', '2018-09-19T01:30:00',
                    '2018-09-19T02:30:00', '2018-09-19T03:30:00',
                    '2018-09-19T04:30:00', '2018-09-19T05:30:00', '2018-09-19T06:30:00'
                ],
            },
            tooltip: {
                x: {
                    format: 'dd/MM/yy HH:mm'
                },
            },
            legend: {
                offsetY: -10,
            },
        };
        const chart = new ApexCharts(
            document.querySelector('#apex-spline-area-chart'),
            options
        );
        chart.render();
    }

}
