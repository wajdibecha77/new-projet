import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-monthly-hours',
  templateUrl: './monthly-hours.component.html',
  styleUrls: ['./monthly-hours.component.scss']
})

export class MonthlyHoursComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 400,
                type: 'radialBar',
            },
            colors: ['#2962ff'],
            plotOptions: {
                radialBar: {
                    hollow: {
                        size: '80%',
                    },
                    dataLabels: {
                        name: {
                            show: true,
                            fontSize: '30px',
                        },
                        value: {
                            show: true,
                        }
                    },
                },
            },
            series: [70],
            labels: ['12,000'],
        };
        const chart = new ApexCharts(
            document.querySelector('#monthly-hours-target'),
            options
        );
        chart.render();
    }

}
