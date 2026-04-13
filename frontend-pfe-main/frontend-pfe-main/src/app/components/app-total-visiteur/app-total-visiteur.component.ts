import { Component, Input, OnInit } from "@angular/core";

@Component({
    selector: "app-app-total-visiteur",
    templateUrl: "./app-total-visiteur.component.html",
    styleUrls: ["./app-total-visiteur.component.scss"],
})
export class AppTotalVisiteurComponent implements OnInit {
    @Input() dataElec;
    @Input() dataMeca;
    @Input() dataInfo;
    @Input() dataPlom;
    constructor() {}
    ngOnChanges() {
        const options = {
            chart: {
                height: 380,
                type: "line",
            },
            colors: ["#2962ff", "#886cff", "#78f542", "#991431"],
            series: [
                {
                    name: "Electrique",
                    data: this.dataElec,
                },
                {
                    name: "Mecanique",
                    data: this.dataMeca,
                },
                {
                    name: "Plomberie & chaud froid",
                    data: this.dataPlom,
                },
                {
                    name: "Informatique",
                    data: this.dataInfo,
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
        const chart = new ApexCharts(
            document.querySelector("#total-sales-chart"),
            options
        );
        chart.render();
    }
    ngOnInit() {}
}
