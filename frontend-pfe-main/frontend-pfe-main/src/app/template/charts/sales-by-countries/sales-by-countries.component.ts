import { Component, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-sales-by-countries',
  templateUrl: './sales-by-countries.component.html',
  styleUrls: ['./sales-by-countries.component.scss']
})

export class SalesByCountriesComponent implements OnInit {

    constructor() { }

    ngOnInit() {
        const options = {
            chart: {
                width: '100%',
                height: 391,
                type: 'pie',
            },
            labels: ['UK', 'USA', 'Canada', 'Australia', 'Italy'],
            colors: ['#2962ff', '#2458e5', '#204ecc', '#1c44b2', '#183a99'],
            series: [500, 800, 500, 300, 250],
            responsive: [{
                breakpoint: 300,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }],
            legend: {
                horizontalAlign: 'right',
            }
        }

        const chart = new ApexCharts(
            document.querySelector('#sales-by-countries'),
            options
        );

        chart.render();
    }

}
