import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-mixed-charts-line-column',
  templateUrl: './mixed-charts-line-column.component.html',
  styleUrls: ['./mixed-charts-line-column.component.scss']
})
export class MixedChartsLineColumnComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 400,
                type: 'line',
            },
            series: [{
            name: 'Website Blog',
                type: 'column',
                data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160, 440, 505, 414]
            }, {
                name: 'Social Media',
                type: 'line',
                data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16, 23, 42, 35]
            }],
            stroke: {
                width: [0, 4]
            },
            title: {
                text: 'Traffic Sources'
            },
            legend: {
                offsetY: -10,
            },
            labels: [
                '01 Jan 2019', '02 Jan 2019', '03 Jan 2019',
                '04 Jan 2019', '05 Jan 2019', '06 Jan 2019',
                '07 Jan 2019', '08 Jan 2019', '09 Jan 2019',
                '10 Jan 2019', '11 Jan 2019', '12 Jan 2019',
                '13 Jan 2019', '14 Jan 2019', '15 Jan 2019'
            ],
            xaxis: {
                type: 'datetime'
            },
            yaxis: [{
                title: {
                    text: 'Website Blog',
                },
            }, {
                opposite: true,
                title: {
                    text: 'Social Media'
                }
            }]
        };
        const chart = new ApexCharts(
            document.querySelector('#apex-mixed-charts-line-column'),
            options
        );
        chart.render();
    }

}
