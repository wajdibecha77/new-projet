import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-gradient-donut-chart',
  templateUrl: './gradient-donut-chart.component.html',
  styleUrls: ['./gradient-donut-chart.component.scss']
})
export class GradientDonutChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                width: '100%',
                height: 455,
                type: 'donut',
            },
            dataLabels: {
                enabled: false
            },
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            series: [44, 55, 41, 17, 15, 35],
            fill: {
                type: 'gradient',
            },
            legend: {
                formatter(val: any, opts: any) {
                    return val + ' - ' + opts.w.globals.series[opts.seriesIndex]
                }
            },
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
            document.querySelector('#apex-gradient-donut-chart'),
            options
        );
        chart.render();
    }

}
