import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import ApexCharts from "apexcharts";
import { User } from "src/app/models/user";
import { InterventionService } from "src/app/services/intervention.service";
import { ReportService } from "src/app/services/report.service";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-dashboard-home",
  templateUrl: "./dashboard-home.component.html",
  styleUrls: ["./dashboard-home.component.scss"],
  encapsulation: ViewEncapsulation.Emulated,
})
export class DashboardHomeComponent implements OnInit, AfterViewInit, OnDestroy {
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

  /* ── FAB Report ── */
  public fabMenuOpen = false;
  public isGenerating = false;
  public reportHistory: any[] = [];
  public showHistoryModal = false;
  public fabMessage = "";
  public fabMessageType: "success" | "error" | "" = "";

  constructor(
    private userService: UserService,
    private interService: InterventionService,
    private reportService: ReportService
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
      { key: "elec", label: "Electrique", value: this.totalElec, color: "#22c55e" },
      { key: "meca", label: "Mecanique", value: this.totalMeca, color: "#f59e0b" },
      { key: "plom", label: "Plomberie", value: this.totalPlom, color: "#8b5cf6" },
    ];
  }

  getCategoryPercent(value: number): number {
    if (!this.total) {
      return 0;
    }

    return Math.round((Number(value || 0) * 100) / this.total);
  }

  private renderCategoryChart(): void {
    if (!this.viewReady) {
      return;
    }

    const target = document.querySelector("#category-donut-chart");
    if (!target) {
      return;
    }

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

  private initUser(): void {
    if (!this.token) {
      return;
    }

    this.isConnected = true;

    this.userService.getConnectedUser().subscribe({
      next: (res: any) => {
        this.account = res?.data;
      },
      error: () => {
        console.log("Error loading user");
      },
    });
  }

  private loadDashboard(): void {
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
            default:
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
      },
    });
  }

  private resetDashboardStats(): void {
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

  private getType(name: string): "INFO" | "MECA" | "ELEC" | "PLOM" | null {
    const value = (name || "").toLowerCase();

    if (value.includes("info")) {
      return "INFO";
    }

    if (value.includes("meca")) {
      return "MECA";
    }

    if (value.includes("elec")) {
      return "ELEC";
    }

    if (value.includes("plom") || value.includes("chaud") || value.includes("froid")) {
      return "PLOM";
    }

    return null;
  }

  /* ═══════════════════════════════════════════
   * FAB Report — Methods
   * ═══════════════════════════════════════════ */

  toggleFabMenu(): void {
    this.fabMenuOpen = !this.fabMenuOpen;
    if (!this.fabMenuOpen) {
      this.showHistoryModal = false;
    }
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".fab-container")) {
      this.fabMenuOpen = false;
      this.showHistoryModal = false;
    }
  }

  generatePdf(): void {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.fabMenuOpen = false;
    this.showFabMessage("", "");

    if (this.isMobile()) {
      // ── Mobile path ──
      // Blob URLs cannot be transferred across tabs on Android/Capacitor.
      // Request a short-lived one-time token from the backend (authenticated),
      // then open the direct download URL — the browser handles it natively.
      this.reportService.generateDownloadToken().subscribe({
        next: (res: any) => {
          this.isGenerating = false;
          if (res?.success && res?.token) {
            const downloadUrl = `${this.reportService.apiUrl}/reports/download-token/${res.token}`;
            window.open(downloadUrl, "_blank");
            this.showFabMessage(
              "PDF en cours de telechargement. Si rien ne se passe, autorisez les popups pour ce site.",
              "success"
            );
          } else {
            this.showFabMessage("Erreur lors de la generation du rapport.", "error");
          }
        },
        error: (err: any) => {
          console.error("PDF generation error (mobile):", err);
          this.isGenerating = false;
          this.showFabMessage("Erreur lors de la generation du rapport.", "error");
        },
      });
    } else {
      // ── PC path (unchanged) ──
      // Blob URL + hidden anchor click works reliably on all desktop browsers.
      this.reportService.generateReport().subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const fileName = `rapport-tav-${new Date().toISOString().slice(0, 10)}.pdf`;
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
          this.isGenerating = false;
          this.showFabMessage("Rapport PDF genere avec succes!", "success");
        },
        error: (err: any) => {
          console.error("PDF generation error:", err);
          this.isGenerating = false;
          this.showFabMessage("Erreur lors de la generation du rapport.", "error");
        },
      });
    }
  }
  sendReportEmail(): void {
    this.fabMenuOpen = false;
    this.showFabMessage("", "");

    const email = prompt("Entrez l'adresse email du destinataire:");
    if (!email || !email.trim()) return;

    this.isGenerating = true;
    this.reportService.sendReportByEmail(email.trim()).subscribe({
      next: (res: any) => {
        this.isGenerating = false;
        this.showFabMessage(res?.message || "Email envoye!", "success");
      },
      error: (err: any) => {
        console.error("Email send error:", err);
        this.isGenerating = false;
        this.showFabMessage("Erreur lors de l'envoi de l'email.", "error");
      },
    });
  }

  viewHistory(): void {
    this.fabMenuOpen = false;
    this.showHistoryModal = !this.showHistoryModal;

    if (this.showHistoryModal) {
      this.reportService.getReportHistory().subscribe({
        next: (res: any) => {
          this.reportHistory = res?.reports || [];
        },
        error: () => {
          this.reportHistory = [];
        },
      });
    }
  }

  downloadHistoryReport(filename: string): void {
    if (this.isMobile()) {
      // ── Mobile path ──
      // Get a one-time token for this existing report file, then open the direct URL.
      this.reportService.createHistoryDownloadToken(filename).subscribe({
        next: (res: any) => {
          if (res?.success && res?.token) {
            const downloadUrl = `${this.reportService.apiUrl}/reports/download-token/${res.token}`;
            window.open(downloadUrl, "_blank");
          } else {
            this.showFabMessage("Impossible de telecharger ce rapport.", "error");
          }
        },
        error: (err: any) => {
          console.error("History download error (mobile):", err);
          this.showFabMessage("Erreur lors du telechargement.", "error");
        },
      });
    } else {
      // ── PC path (unchanged) ──
      this.reportService.downloadReport(filename).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
        },
        error: (err: any) => {
          console.error("Download error:", err);
          this.showFabMessage("Erreur lors du telechargement.", "error");
        },
      });
    }
  }
  /** Détecte si l'utilisateur est sur un appareil mobile */
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  private showFabMessage(msg: string, type: "success" | "error" | ""): void {
    this.fabMessage = msg;
    this.fabMessageType = type;
    if (msg) {
      setTimeout(() => {
        this.fabMessage = "";
        this.fabMessageType = "";
      }, 5000);
    }
  }
}
