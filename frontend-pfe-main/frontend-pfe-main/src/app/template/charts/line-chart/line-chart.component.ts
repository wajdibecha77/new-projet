import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
    selector: 'app-line-chart',
    templateUrl: './line-chart.component.html',
    styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 360,
                type: 'line',
                zoom: {
                    enabled: false
                }
            },
            series: [{
                name: 'Desktops',
                data: [10, 41, 35, 51, 49, 62, 69, 91, 148, 160, 150, 200]
            }],
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'straight'
            },
            title: {
                text: 'Product Trends by Month',
                align: 'left',
                style: {
                    fontSize: '13px',
                    color: '#666'
                }
            },
            grid: {
                row: {
                    colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
                    opacity: 0.5
                },
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            }
        }

        const chart = new ApexCharts(
            document.querySelector('#apex-basic-line-chart'),
            options
        );

        chart.render();
    }

}
