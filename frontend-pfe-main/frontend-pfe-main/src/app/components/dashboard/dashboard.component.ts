import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import ApexCharts from "apexcharts";
import { User } from "src/app/models/user";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";
import { SidebarService } from "src/app/services/sidebar.service"; // ðŸ”¥ Ù…Ù‡Ù…

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  /* ================= STATS ================= */
  public totalInfo = 0;
  public totalMeca = 0;
  public totalElec = 0;
  public totalPlom = 0;
  public total = 0;
  public totalByMonth = 0;
  public totalByMonthEnCours = 0;
  public totalByMonthTerminee = 0;
  public totalByMonthNonAffectee = 0;

  public dataElec: number[] = Array(12).fill(0);
  public dataMeca: number[] = Array(12).fill(0);
  public dataInfo: number[] = Array(12).fill(0);
  public dataPlom: number[] = Array(12).fill(0);

  public token: string | null = localStorage.getItem("token");
  public isConnected = false;

  public account!: User;
  private categoryChart: ApexCharts | null = null;
  private viewReady = false;

  constructor(
    private userService: UserService,
    private interService: InterventionService,
    public sidebar: SidebarService // ðŸ”¥ Ø§Ù„Ø­Ù„ Ø§Ù„ØµØ­ÙŠØ­
  ) {}

  ngOnInit(): void {
    this.initUser();
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCategoryChart();
  }

  ngOnDestroy(): void {
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }
  }

  get categoryLegend() {
    return [
      { key: "info", label: "Informatique", value: this.totalInfo, color: "#3b82f6" },
      { key: "elec", label: "Ã‰lectrique", value: this.totalElec, color: "#22c55e" },
      { key: "meca", label: "MÃ©canique", value: this.totalMeca, color: "#f59e0b" },
      { key: "plom", label: "Plomberie", value: this.totalPlom, color: "#8b5cf6" },
    ];
  }

  getCategoryPercent(value: number): number {
    if (!this.total) return 0;
    return Math.round((Number(value || 0) * 100) / this.total);
  }

  private renderCategoryChart(): void {
    if (!this.viewReady) return;

    const target = document.querySelector("#category-donut-chart");
    if (!target) return;

    const legend = this.categoryLegend;

    const options = {
      chart: {
        type: "donut",
        height: 250,
        width: "100%",
        toolbar: { show: false },
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        parentHeightOffset: 0,
      },
      series: legend.map((item) => Number(item.value || 0)),
      labels: legend.map((item) => item.label),
      colors: legend.map((item) => item.color),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 6,
        colors: ["#ffffff"],
      },
      plotOptions: {
        pie: {
          customScale: 0.96,
          donut: {
            size: "72%",
          },
        },
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 230,
            },
          },
        },
      ],
    };

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    this.categoryChart = new ApexCharts(target, options);
    this.categoryChart.render();
  }

  /* ================= USER ================= */
  private initUser() {
    if (!this.token) return;

    this.isConnected = true;

    this.userService.getConnectedUser().subscribe({
      next: (res: any) => {
        this.account = res?.data;
      },
      error: () => {
        console.log("Error loading user");
      }
    });
  }

  /* ================= DASHBOARD ================= */
  private loadDashboard() {
    this.interService.getAllInterventions().subscribe({
      next: (res: any[]) => {
        this.resetDashboardStats();
        this.total = res.length;

        const currentMonth = new Date().getMonth();

        res.forEach((inter) => {
          const month = new Date(inter.createdAt).getMonth();
          const type = this.getType(inter?.name);

          switch (type) {
            case "INFO":
              this.totalInfo++;
              this.dataInfo[month]++;
              break;

            case "MECA":
              this.totalMeca++;
              this.dataMeca[month]++;
              break;

            case "ELEC":
              this.totalElec++;
              this.dataElec[month]++;
              break;

            case "PLOM":
              this.totalPlom++;
              this.dataPlom[month]++;
              break;
          }

          if (month === currentMonth) {
            this.totalByMonth++;
            const status = String(inter?.etat || "").toUpperCase();
            if (status === "EN_COURS") {
              this.totalByMonthEnCours++;
            } else if (status === "TERMINEE") {
              this.totalByMonthTerminee++;
            } else {
              this.totalByMonthNonAffectee++;
            }
          }
        });

        this.renderCategoryChart();
      },
      error: () => {
        console.log("Error loading interventions");
      }
    });
  }

  /* ================= RESET ================= */
  private resetDashboardStats() {
    this.totalInfo = 0;
    this.totalMeca = 0;
    this.totalElec = 0;
    this.totalPlom = 0;
    this.total = 0;
    this.totalByMonth = 0;
    this.totalByMonthEnCours = 0;
    this.totalByMonthTerminee = 0;
    this.totalByMonthNonAffectee = 0;

    this.dataElec = Array(12).fill(0);
    this.dataMeca = Array(12).fill(0);
    this.dataInfo = Array(12).fill(0);
    this.dataPlom = Array(12).fill(0);
  }

  /* ================= TYPE ================= */
  private getType(name: string): "INFO" | "MECA" | "ELEC" | "PLOM" | null {
    const value = (name || "").toLowerCase();

    if (value.includes("info")) return "INFO";
    if (value.includes("meca")) return "MECA";
    if (value.includes("elec")) return "ELEC";
    if (value.includes("plom") || value.includes("chaud") || value.includes("froid")) return "PLOM";

    return null;
  }
}
