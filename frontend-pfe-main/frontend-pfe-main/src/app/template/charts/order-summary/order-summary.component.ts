import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})

export class OrderSummaryComponent implements OnInit {

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
                curve: 'smooth',
                width: 3,
            },
            series: [{
                name: 'Monthly Sales',
                data: [60, 80, 50, 90, 60, 120, 90, 150, 100, 130]
            }, {
                name: 'Weekly Sales',
                data: [50, 60, 40, 80, 50, 110, 80, 140, 90, 120]
            }],
            xaxis: {
                type: 'date',
                categories: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                labels: {
                    style: {
                        colors: '#686c71',
                        fontSize: '12px',
                    },
                },
                axisBorder: {
                    show: true,
                    color: '#f6f6f7',
                    height: 1,
                    width: '100%',
                    offsetX: 0,
                    offsetY: 0
                },
            },
            tooltip: {
                x: {
                    format: 'dd/MM/yy'
                },
            },
            legend: {
                offsetY: -10,
            },
            grid: {
                show: true,
                borderColor: '#f6f6f7',
            },
            labels: {
                style: {
                    colors: '#686c71',
                    fontSize: '12px',
                },
            },
            axisBorder: {
                show: true,
                color: '#f6f6f7',
                height: 1,
                width: '100%',
                offsetX: 0,
                offsetY: 0
            },
            yaxis: {
                labels: {
                    style: {
                        color: '#686c71',
                        fontSize: '12px',
                    },
                },
                axisBorder: {
                    show: false,
                    color: '#f6f6f7',
                },
            }

        };
        const chart = new ApexCharts(
            document.querySelector('#order-summary'),
            options
        );
        chart.render();
    }

}
