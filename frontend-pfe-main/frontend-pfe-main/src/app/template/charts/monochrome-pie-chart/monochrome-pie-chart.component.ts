import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-monochrome-pie-chart',
  templateUrl: './monochrome-pie-chart.component.html',
  styleUrls: ['./monochrome-pie-chart.component.scss']
})
export class MonochromePieChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                width: '100%',
                height: 430,
                type: 'pie',
            },
            series: [25, 15, 44, 55, 41, 17],
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            theme: {
                monochrome: {
                    enabled: true
                }
            },
            title: {
                text: 'Number of leads'
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
            document.querySelector('#apex-monochrome-pie-chart'),
            options
        );

        chart.render();
    }

}
