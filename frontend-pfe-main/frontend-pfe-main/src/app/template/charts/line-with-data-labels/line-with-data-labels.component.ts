import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-line-with-data-labels',
  templateUrl: './line-with-data-labels.component.html',
  styleUrls: ['./line-with-data-labels.component.scss']
})

export class LineWithDataLabelsComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 365,
                type: 'line',
                shadow: {
                    enabled: true,
                    color: '#000',
                    top: 18,
                    left: 7,
                    blur: 10,
                    opacity: 1
                },
                toolbar: {
                    show: false
                }
            },
            colors: ['#77B6EA', '#545454'],
            dataLabels: {
                enabled: true,
            },
            stroke: {
                curve: 'smooth'
            },
            series: [{
                    name: 'High - 2019',
                    data: [28, 29, 33, 36, 32, 32, 33, 28, 29, 33, 36, 32],
                },
                {
                    name: 'Low - 2019',
                    data: [12, 11, 14, 18, 17, 13, 13, 12, 11, 14, 18, 17]
                }
            ],
            title: {
                text: 'Average High & Low Revenue',
                align: 'left',
                style: {
                    fontSize: '13px',
                    color: '#666'
                }
            },
            grid: {
                borderColor: '#e7e7e7',
                row: {
                    colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
                    opacity: 0.5
                },
            },
            markers: {
                size: 6
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct','Nov', 'Dec'],
                title: {
                    text: 'Month'
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                floating: true,
                offsetY: -10,
                offsetX: -5
            }
        };

        const chart = new ApexCharts(
            document.querySelector('#apex-line-with-data-labels'),
            options
        );

        chart.render();
    }

}
