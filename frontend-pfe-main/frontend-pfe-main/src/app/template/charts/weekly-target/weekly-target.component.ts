import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import ApexCharts from "apexcharts";

@Component({
    selector: "app-weekly-target",
    templateUrl: "./weekly-target.component.html",
    styleUrls: ["./weekly-target.component.scss"],
})
export class WeeklyTargetComponent implements OnInit, OnChanges, OnDestroy {
    @Input() total = 0;
    @Input() totalByMonth = 0;
    @Input() enCours = 0;
    @Input() terminee = 0;
    @Input() nonAffectee = 0;

    private chart: ApexCharts | null = null;

    constructor() {}

    ngOnInit(): void {
        this.renderChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.total || changes.totalByMonth || changes.enCours || changes.terminee || changes.nonAffectee) {
            this.renderChart();
        }
    }

    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    get monthlyStatuses() {
        return [
            { key: "encours", label: "En cours", count: Number(this.enCours || 0), color: "#3b82f6", icon: "fa-clock-o" },
            { key: "terminee", label: "Terminee", count: Number(this.terminee || 0), color: "#22c55e", icon: "fa-check-circle-o" },
            { key: "nonaffectee", label: "Non affectee", count: Number(this.nonAffectee || 0), color: "#f59e0b", icon: "fa-exclamation-circle" },
        ];
    }

    get totalMonthCount(): number {
        return this.monthlyStatuses.reduce((sum, item) => sum + item.count, 0);
    }

    getStatusPercent(count: number): number {
        const totalMonth = this.totalMonthCount;
        if (!totalMonth) return 0;
        return Math.round((Number(count || 0) * 100) / totalMonth);
    }

    private renderChart(): void {
        const target = document.querySelector("#weekly-target-chart");
        if (!target) return;

        const series = this.monthlyStatuses.map((s) => s.count);
        const totalMonth = this.totalMonthCount;

        const options = {
            chart: {
                type: "donut",
                height: 260,
                width: "100%",
                toolbar: { show: false },
                redrawOnParentResize: true,
                redrawOnWindowResize: true,
                parentHeightOffset: 0,
            },
            series,
            labels: this.monthlyStatuses.map((s) => s.label),
            colors: this.monthlyStatuses.map((s) => s.color),
            legend: { show: false },
            stroke: {
                show: true,
                width: 6,
                colors: ["#ffffff"],
            },
            dataLabels: { enabled: false },
            plotOptions: {
                pie: {
                    offsetX: 0,
                    offsetY: 0,
                    customScale: 0.96,
                    donut: {
                        size: "74%",
                        labels: {
                            show: true,
                            name: { show: false },
                            value: { show: false },
                            total: {
                                show: true,
                                label: "Total",
                                formatter: () => String(totalMonth),
                            },
                        },
                    },
                },
            },
            states: {
                hover: {
                    filter: { type: "none" },
                },
                active: {
                    filter: { type: "none" },
                },
            },
            tooltip: {
                y: {
                    formatter: (value: number) => `${value} intervention(s)`,
                },
            },
        };

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new ApexCharts(target, options);
        this.chart.render();
    }
}
