import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, interval } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { InterventionService } from "src/app/services/intervention.service";

@Component({
  selector: "app-mes-demandes",
  templateUrl: "./mes-demandes.component.html",
  styleUrls: ["./mes-demandes.component.scss"],
})
export class MesDemandesComponent implements OnInit, OnDestroy {
  public demandes: any[] = [];
  public isLoading = false;
  public role = String(localStorage.getItem("role") || "").toUpperCase();

  private readonly destroy$ = new Subject<void>();

  constructor(
    private interventionService: InterventionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getMesDemandes();

    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.getMesDemandes());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMesDemandes(): void {
    this.isLoading = true;

    this.interventionService.getMesDemandes().subscribe(
      (res: any) => {
        this.demandes = Array.isArray(res) ? res : [];
        this.isLoading = false;
      },
      () => {
        this.demandes = [];
        this.isLoading = false;
      }
    );
  }

  viewDetails(id: string): void {
    this.router.navigate(["/intervention", id]);
  }

  getStatusLabel(demande: any): string {
    const etat = String(demande?.etat || "").toUpperCase();

    if (etat === "TERMINEE") return "Terminée";
    if (etat === "EN_COURS") return "En cours";

    if (demande?.affectedBy || demande?.assignedTo) {
      return "Acceptée";
    }

    return "Envoyée";
  }

  getStatusClass(demande: any): string {
    const label = this.getStatusLabel(demande);

    if (label === "Terminée") return "status-terminee";
    if (label === "En cours") return "status-encours";
    if (label === "Acceptée") return "status-acceptee";

    return "status-envoyee";
  }

  getProgress(demande: any): number {
    const label = this.getStatusLabel(demande);

    if (label === "Terminée") return 100;
    if (label === "En cours") return 75;
    if (label === "Acceptée") return 50;

    return 25;
  }

  trackById(index: number, demande: any): any {
    return demande?._id || index;
  }
}
