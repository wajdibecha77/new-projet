import { Component, OnInit, OnDestroy, ViewEncapsulation } from "@angular/core";
import { User } from "src/app/models/user";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";
import { Router } from "@angular/router";

@Component({
    selector: "app-dashboard-visiteur",
    templateUrl: "./dashboard-visiteur.component.html",
    styleUrls: ["./dashboard-visiteur.component.scss"],
    encapsulation: ViewEncapsulation.Emulated,
})
export class DashboardVisiteurComponent implements OnInit, OnDestroy {
    private readonly technicianRoles = ["INFORMATICIEN", "ELECTRICIEN", "MECANICIEN", "PLOMBERIE", "PLOMBIER", "TECHNICIEN"];
    public interventions: any = [];
    public intervention;
    public total;
    public role = String(localStorage.getItem("role") || "").toUpperCase();
    public showGuide: boolean = true;
    public showForm = false;
    public currentSlide: number = 1;
    public currentStats: any = null;
    public currentDashboardLabel = "Technicien";
    public currentDashboardIcon = "fa fa-wrench";
    public dataElec: any = {
        total: 0,
        totalbyInter: 0,
        totalbyMe: 0,
        totalMe: 0,
        totalEnCours: 0,
        totalNotAffected: 0,
    };
    public dataMeca: any = {
        total: 0,
        totalMe: 0,
        totalbyMe: 0,
        totalbyInter: 0,
        totalEnCours: 0,
        totalNotAffected: 0,
    };
    public dataInfo: any = {
        total: 0,
        totalMe: 0,
        totalbyMe: 0,
        totalEnCours: 0,
        totalbyInter: 0,
        totalNotAffected: 0,
    };
    public dataPlom: any = {
        total: 0,
        totalMe: 0,
        totalbyMe: 0,
        totalbyInter: 0,
        totalEnCours: 0,
        totalNotAffected: 0,
    };
    public token?: any = localStorage.getItem("token");
    public isConnected: boolean = false;

    public account: any;
    constructor(
        private userService: UserService,
        private interService: InterventionService,
        private router: Router
    ) {
        this.isConnected = userService.isConnected;
    }

    hasRole(...roles: string[]): boolean {
        const currentRole = String(this.account?.role || this.role || "").toUpperCase();
        return roles.map((role) => String(role || "").toUpperCase()).includes(currentRole);
    }

    isTechnicianDashboard(): boolean {
        return this.hasRole(...this.technicianRoles);
    }

    isEmployeeDashboard(): boolean {
        return this.currentRoleLabel === "EMPLOYEE" || this.role === "EMPLOYEE";
    }

    get displayedInterventions(): any[] {
        return Array.isArray(this.interventions) ? this.interventions : [];
    }

    get hasInterventions(): boolean {
        return this.displayedInterventions.length > 0;
    }

    get totalInterventionsCount(): number {
        return this.displayedInterventions.length;
    }

    get enCoursCount(): number {
        return this.displayedInterventions.filter(
            (inter) => String(inter?.etat || "").toUpperCase() === "EN_COURS"
        ).length;
    }

    get termineesCount(): number {
        return this.displayedInterventions.filter(
            (inter) => String(inter?.etat || "").toUpperCase() === "TERMINEE"
        ).length;
    }

    get nonAffecteeCount(): number {
        return this.displayedInterventions.filter(
            (inter) => String(inter?.etat || "").toUpperCase() === "NON_AFFECTEE"
        ).length;
    }

    get aiInterventionsCount(): number {
        return this.displayedInterventions.filter((inter) => Boolean(inter?.isAI)).length;
    }

    get manualInterventionsCount(): number {
        return this.displayedInterventions.filter((inter) => !inter?.isAI).length;
    }

    get currentRoleLabel(): string {
        return String(this.account?.role || this.role || "").toUpperCase();
    }

    get completionRate(): string {
        const total = Number(this.currentStats?.total || 0);
        const completed = this.displayedInterventions.filter(
            (inter) => String(inter?.etat || "").toUpperCase() === "TERMINEE"
        ).length;

        if (!total) return "0";
        return ((completed * 100) / total).toFixed(0);
    }

    private updateCurrentDashboardConfig() {
        const role = this.currentRoleLabel;

        if (role === "INFORMATICIEN") {
            this.currentStats = this.dataInfo;
            this.currentDashboardLabel = "Informatique";
            this.currentDashboardIcon = "fa fa-laptop";
            return;
        }

        if (role === "ELECTRICIEN") {
            this.currentStats = this.dataElec;
            this.currentDashboardLabel = "Electrique";
            this.currentDashboardIcon = "fa fa-battery-half";
            return;
        }

        if (role === "MECANICIEN") {
            this.currentStats = this.dataMeca;
            this.currentDashboardLabel = "Mecanique";
            this.currentDashboardIcon = "fa fa-car";
            return;
        }

        if (role === "PLOMBERIE" || role === "PLOMBIER") {
            this.currentStats = this.dataPlom;
            this.currentDashboardLabel = "Plomberie";
            this.currentDashboardIcon = "fa fa-tint";
            return;
        }

        this.currentStats = {
            total: this.total || 0,
            totalMe: this.displayedInterventions.length,
            totalbyInter: this.total ? "100.00" : "0.00",
            totalbyMe: this.total ? "100.00" : "0.00",
            totalEnCours: this.displayedInterventions.filter(
                (inter) => String(inter?.etat || "").toUpperCase() === "EN_COURS"
            ).length,
            totalNotAffected: this.displayedInterventions.filter(
                (inter) => String(inter?.etat || "").toUpperCase() === "NON_AFFECTEE"
            ).length,
        };
        this.currentDashboardLabel = "Technicien";
        this.currentDashboardIcon = "fa fa-wrench";
    }

    getStatusClass(etat: string): string {
        const normalized = String(etat || "").toUpperCase();
        if (normalized === "TERMINEE") return "badge badge_success py-1 px-3";
        if (normalized === "EN_COURS") return "badge badge_warning py-1 px-3";
        if (normalized === "NON_AFFECTEE") return "badge badge_danger py-1 px-3";
        return "badge badge-secondary py-1 px-3";
    }

    formatStatus(etat: string): string {
        const normalized = String(etat || "").toUpperCase();
        if (normalized === "TERMINEE") return "Terminee";
        if (normalized === "EN_COURS") return "En cours";
        if (normalized === "NON_AFFECTEE") return "Non affectee";
        return etat || "-";
    }

    formatDate(value: any): string {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR");
    }

    nextSlide() {
        if (this.currentSlide < 4) {
            this.currentSlide++;
        }
    }

    prevSlide() {
        if (this.currentSlide > 1) {
            this.currentSlide--;
        }
    }

    finishGuide() {
        document.body.classList.remove('hide-sidebar-guide');
        this.router.navigate(["/reclamation"]);
    }

    ngOnDestroy() {
        document.body.classList.remove('hide-sidebar-guide');
    }

    private resetStats() {
        this.interventions = [];
        this.total = 0;
        this.currentStats = null;
        this.dataElec = {
            total: 0,
            totalbyInter: 0,
            totalbyMe: 0,
            totalMe: 0,
            totalEnCours: 0,
            totalNotAffected: 0,
        };
        this.dataMeca = {
            total: 0,
            totalMe: 0,
            totalbyMe: 0,
            totalbyInter: 0,
            totalEnCours: 0,
            totalNotAffected: 0,
        };
        this.dataInfo = {
            total: 0,
            totalMe: 0,
            totalbyMe: 0,
            totalEnCours: 0,
            totalbyInter: 0,
            totalNotAffected: 0,
        };
        this.dataPlom = {
            total: 0,
            totalMe: 0,
            totalbyMe: 0,
            totalbyInter: 0,
            totalEnCours: 0,
            totalNotAffected: 0,
        };
    }

    private applyInterventions(interventions: any[]) {
        this.resetStats();

        const safeInterventions = Array.isArray(interventions)
            ? [...interventions]
            : [];

        this.total = safeInterventions.length;
        this.interventions = safeInterventions;

        safeInterventions.forEach((inter) => {
            if (inter.name.toLowerCase().includes("info")) {
                this.dataInfo.total += 1;
                this.dataInfo.totalbyInter = (
                    (this.dataInfo.total * 100) /
                    this.total
                ).toFixed(2);
                if (
                    inter.affectedBy &&
                    inter.etat == "EN_COURS"
                ) {
                    this.dataInfo.totalEnCours += 1;
                    if (
                        inter.affectedBy._id == this.account._id
                    ) {
                        this.dataInfo.totalMe += 1;

                        this.dataInfo.totalbyMe = (
                            (this.dataInfo.totalMe * 100) /
                            this.dataInfo.total
                        ).toFixed(2);
                    }
                } else if (
                    !inter.affectedBy &&
                    inter.etat != "TERMINEE"
                ) {
                    this.dataInfo.totalNotAffected += 1;
                }
            }
            if (inter.name.toLowerCase().includes("meca")) {
                this.dataMeca.total += 1;
                this.dataMeca.totalbyInter = (
                    (this.dataMeca.total * 100) /
                    this.total
                ).toFixed(2);
                if (
                    inter.affectedBy &&
                    inter.etat == "EN_COURS"
                ) {
                    this.dataMeca.totalEnCours += 1;
                    if (
                        inter.affectedBy._id == this.account._id
                    ) {
                        this.dataMeca.totalMe += 1;
                        this.dataMeca.totalbyMe = (
                            (this.dataMeca.totalMe * 100) /
                            this.dataMeca.total
                        ).toFixed(2);
                    }
                } else if (
                    !inter.affectedBy &&
                    inter.etat != "TERMINEE"
                ) {
                    this.dataMeca.totalNotAffected += 1;
                }
            }
            if (inter.name.toLowerCase().includes("elec")) {
                this.dataElec.total += 1;
                this.dataElec.totalbyInter = (
                    (this.dataElec.total * 100) /
                    this.total
                ).toFixed(2);
                if (
                    inter.affectedBy &&
                    inter.etat == "EN_COURS"
                ) {
                    this.dataElec.totalEnCours += 1;
                    if (
                        inter.affectedBy._id == this.account._id
                    ) {
                        this.dataElec.totalMe += 1;
                        this.dataElec.totalbyMe = (
                            (this.dataElec.totalMe * 100) /
                            this.dataElec.total
                        ).toFixed(2);
                    }
                } else if (
                    !inter.affectedBy &&
                    inter.etat != "TERMINEE"
                ) {
                    this.dataElec.totalNotAffected += 1;
                }
            }
            if (inter.name.toLowerCase().includes("plom")) {
                this.dataPlom.total += 1;
                this.dataPlom.totalbyInter = (
                    (this.dataPlom.total * 100) /
                    this.total
                ).toFixed(2);
                if (
                    inter.affectedBy &&
                    inter.etat == "EN_COURS"
                ) {
                    this.dataPlom.totalEnCours += 1;
                    if (
                        inter.affectedBy._id == this.account._id
                    ) {
                        this.dataPlom.totalMe += 1;
                        this.dataPlom.totalbyMe = (
                            (this.dataPlom.totalMe * 100) /
                            this.dataPlom.total
                        ).toFixed(2);
                    }
                } else if (
                    !inter.affectedBy &&
                    inter.etat != "TERMINEE"
                ) {
                    this.dataPlom.totalNotAffected += 1;
                }
            }
        });

        this.updateCurrentDashboardConfig();
    }

    getInterventions() {
        if (!this.token) return;

        const isEmployee =
            this.currentRoleLabel === "EMPLOYEE" || this.role === "EMPLOYEE";

        const source$ = isEmployee
            ? this.interService.getAllInterventions()
            : this.interService.getMyInterventions();

        source$.subscribe((res: any) => {
            this.applyInterventions(res);
        });
    }

    onInterventionCreated(newIntervention: any) {
        if (newIntervention) {
            this.interventions = [newIntervention, ...this.displayedInterventions];
            this.total = this.interventions.length;
        }

        this.closeForm();
        this.getInterventions();
    }

    openForm() {
        this.showForm = true;
    }

    closeForm() {
        this.showForm = false;
    }

    ngOnInit(): void {
        if (this.token) {
            this.isConnected = true;

            this.userService.getConnectedUser().subscribe((res: any) => {
                this.account = res.data;
                this.showGuide = this.hasRole("CLIENT");

                if (this.showGuide) {
                    document.body.classList.add("hide-sidebar-guide");
                } else {
                    document.body.classList.remove("hide-sidebar-guide");
                }

                this.getInterventions();
            });
        }
    }
}


