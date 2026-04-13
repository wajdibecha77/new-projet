import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-simple-donut-chart',
  templateUrl: './simple-donut-chart.component.html',
  styleUrls: ['./simple-donut-chart.component.scss']
})
export class SimpleDonutChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                width: '100%',
                height: 430,
                type: 'donut',
            },
            labels: ['UK', 'USA', 'Canada', 'Australia', 'Italy'],
            series: [44, 55, 41, 17, 15],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        const chart = new ApexCharts(
            document.querySelector("#apex-simple-donut-chart"),
            options
        );
        chart.render();
    }

}
