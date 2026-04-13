import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';
import * as data from '../../../json/stock-prices.json';

@Component({
    selector: 'app-apex-area-chart',
    templateUrl: './apex-area-chart.component.html',
    styleUrls: ['./apex-area-chart.component.scss']
})
export class ApexAreaChartComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 374,
                type: 'area',
                zoom: {
                    enabled: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'straight'
            },
            series: [{
                name: 'STOCK ABC',
                data: data.monthDataSeries1.prices
            }],
            title: {
                text: 'Fundamental Analysis of Stocks',
                align: 'left',
                style: {
                    fontSize: '13px',
                    color: '#666'
                }
            },
            subtitle: {
                text: 'Price Movements',
                align: 'left'
            },
            labels: data.monthDataSeries1.dates,
            xaxis: {
                type: 'datetime',
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
            yaxis: {
                opposite: true,
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
            },
            legend: {
                horizontalAlign: 'left'
            },
            grid: {
                show: true,
                borderColor: '#f6f6f7',
            },
        }

        const chart = new ApexCharts(
            document.querySelector('#apex-basic-area-chart'),
            options
        );

        chart.render();
    }

}
