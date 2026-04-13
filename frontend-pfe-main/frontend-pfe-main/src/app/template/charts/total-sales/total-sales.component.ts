import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import ApexCharts from "apexcharts";

@Component({
    selector: "app-total-sales",
    templateUrl: "./total-sales.component.html",
    styleUrls: ["./total-sales.component.scss"],
})
export class TotalSalesComponent implements OnInit, OnChanges, OnDestroy {
    @Input() dataElec;
    @Input() dataMeca;
    @Input() dataInfo;
    @Input() dataPlom;
    private chart: ApexCharts | null = null;
    constructor() {}

    private toMonthlyData(input: any): number[] {
        if (Array.isArray(input) && input.length === 12) {
            return input.map((v) => Number(v || 0));
        }
        return Array(12).fill(0);
    }

    private renderChart() {
        const options = {
            chart: {
                height: 380,
                type: "line",
            },
            colors: ["#2962ff", "#886cff", "#78f542", "#991431"],
            series: [
                {
                    name: "Electrique",
                    data: this.toMonthlyData(this.dataElec),
                },
                {
                    name: "Mecanique",
                    data: this.toMonthlyData(this.dataMeca),
                },
                {
                    name: "Plomberie & chaud froid",
                    data: this.toMonthlyData(this.dataPlom),
                },
                {
                    name: "Informatique",
                    data: this.toMonthlyData(this.dataInfo),
                },
            ],
            labels: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "July",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ],
            markers: {
                size: 0,
            },
            stroke: {
                width: 3,
                curve: "smooth",
                lineCap: "round",
            },
            legend: {
                position: "top",
            },
            grid: {
                show: true,
                borderColor: "#f6f6f7",
            },
            xaxis: {
                labels: {
                    style: {
                        colors: "#686c71",
                        fontSize: "12px",
                    },
                },
                axisBorder: {
                    show: true,
                    color: "#f6f6f7",
                    height: 1,
                    width: "100%",
                    offsetX: 0,
                    offsetY: 0,
                },
            },
            yaxis: {
                labels: {
                    style: {
                        color: "#686c71",
                        fontSize: "12px",
                    },
                },
                axisBorder: {
                    show: true,
                    color: "#f6f6f7",
                },
            },
        };
        const chartContainer = document.querySelector("#total-sales-chart");
        if (!chartContainer) return;

        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new ApexCharts(chartContainer, options);
        this.chart.render();
    }

    ngOnChanges(_: SimpleChanges) {
        this.renderChart();
    }

    ngOnInit() {
        this.renderChart();
    }

    ngOnDestroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
