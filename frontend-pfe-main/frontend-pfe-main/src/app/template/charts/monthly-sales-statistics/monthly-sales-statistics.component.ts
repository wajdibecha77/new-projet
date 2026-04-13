import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-monthly-sales-statistics',
  templateUrl: './monthly-sales-statistics.component.html',
  styleUrls: ['./monthly-sales-statistics.component.scss']
})
export class MonthlySalesStatisticsComponent implements OnInit {

  constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 320,
                type: 'bar',
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '35%',
                    endingShape: 'rounded'
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 1,
                colors: ['transparent']
            },
            colors: ['#6a4ffc', '#2962ff', '#a64edd'],
            series: [{
                name: 'Net Profit',
                data: [44, 55, 57, 56, 61, 58, 63, 60, 66, 70, 75, 80]
            }, {
                name: 'Revenue',
                data: [76, 85, 101, 98, 87, 105, 91, 114, 94, 100, 110, 96]
            }, {
                name: 'Free Cash Flow',
                data: [35, 41, 36, 26, 45, 48, 52, 53, 41, 55, 45, 60]
            }],
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                labels: {
                    style: {
                        colors: '#686c71',
                        fontSize: '12px',
                    },
                },
            },
            fill: {
                opacity: 1
            },
            tooltip: {
                y: {
                    formatter(val: any) {
                        return '$' + val + ' Thousands';
                    }
                }
            },
            legend: {
                offsetY: -10,
            },
            grid: {
                show: true,
                borderColor: '#f6f6f7',
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
        }

        const chart = new ApexCharts(
            document.querySelector('#month-sales-statistics'),
            options
        );

        chart.render();
    }

}
