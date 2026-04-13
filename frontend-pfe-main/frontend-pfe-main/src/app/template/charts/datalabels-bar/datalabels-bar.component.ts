import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-datalabels-bar',
  templateUrl: './datalabels-bar.component.html',
  styleUrls: ['./datalabels-bar.component.scss']
})
export class DatalabelsBarComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                height: 380,
                type: 'bar'
            },
            plotOptions: {
                bar: {
                    barHeight: '100%',
                    distributed: true,
                    horizontal: true,
                    dataLabels: {
                        position: 'bottom'
                    },
                }
            },
            colors: ['#33b2df', '#546E7A', '#d4526e', '#13d8aa', '#A5978B', '#2b908f', '#f9a3a4', '#90ee7e', '#f48024', '#69d2e7'],
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: {
                    colors: ['#fff']
                },
                formatter(val: any, opt: any) {
                    return opt.w.globals.labels[opt.dataPointIndex] + ':  ' + val;
                },
                offsetX: 0,
                dropShadow: {
                  enabled: true
                }
            },
            series: [{
                data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380]
            }],
            stroke: {
                width: 1,
              colors: ['#fff']
            },
            xaxis: {
                categories: [
                    'South Korea', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan', 'United States', 'China', 'India'
                ],
            },
            yaxis: {
                labels: {
                    show: false
                }
            },
            title: {
                text: 'Custom DataLabels',
                align: 'center',
                floating: true
            },
            subtitle: {
                text: 'Category Names as DataLabels inside bars',
                align: 'center',
            },
            tooltip: {
                theme: 'dark',
                x: {
                    show: false
                },
                y: {
                    title: {
                        formatter() {
                            return '';
                        }
                    }
                }
            }
        };

        const chart = new ApexCharts(
            document.querySelector('#apex-custom-datalabels-bar'),
            options
        );
        chart.render();
    }

}
