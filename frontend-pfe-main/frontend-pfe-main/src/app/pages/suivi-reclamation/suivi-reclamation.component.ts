import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ReclamationService } from "src/app/services/reclamation.service";

interface TrackingResult {
  code: string;
  typeIntervention: string;
  description: string;
  etat: string;
}

@Component({
  selector: "app-suivi-reclamation",
  templateUrl: "./suivi-reclamation.component.html",
  styleUrls: ["./suivi-reclamation.component.scss"],
})
export class SuiviReclamationComponent implements OnInit {
  public code = "";
  public loading = false;
  public errorMessage = "";
  public result: TrackingResult | null = null;

  constructor(
    private route: ActivatedRoute,
    private reclamationService: ReclamationService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.code = String(params["code"] || "").trim();

      if (this.code) {
        this.search();
      }
    });
  }

  search(): void {
    const normalizedCode = this.code.trim().toUpperCase();

    this.errorMessage = "";
    this.result = null;

    if (!normalizedCode) {
      this.errorMessage = "Veuillez saisir un code de suivi.";
      return;
    }

    this.loading = true;
    this.reclamationService.trackReclamation(normalizedCode).subscribe({
      next: (response) => {
        this.result = {
          code: response?.code || normalizedCode,
          typeIntervention: response?.typeIntervention || "Autre",
          description: response?.description || "-",
          etat: response?.etat || "EN_ATTENTE",
        };
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.status === 404
            ? "Aucune réclamation trouvée pour ce code."
            : "Impossible de recuperer les informations pour le moment.";
      },
    });
  }

  getStatusLabel(status: string): string {
    const value = String(status || "").toUpperCase();
    if (value === "EN_COURS") return "🟡 EN_COURS";
    if (value === "TERMINEE") return "🟢 TERMINEE";
    return "🔴 EN_ATTENTE";
  }
}
