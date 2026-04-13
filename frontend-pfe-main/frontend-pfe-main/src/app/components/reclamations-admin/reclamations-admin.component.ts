import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ReclamationService } from "src/app/services/reclamation.service";

@Component({
  selector: "app-reclamations-admin",
  templateUrl: "./reclamations-admin.component.html",
  styleUrls: ["./reclamations-admin.component.scss"],
})
export class ReclamationsAdminComponent implements OnInit {

  reclamations: any[] = [];
  selectedReclamation: any = null;

  loading = false;
  actionLoading = false;
  public role: string = localStorage.getItem("role") || "";

  successMessage = "";
  errorMessage = "";

  // 🔥 API URL (يفضل تخليها من environment، أما نخليها كيما تحب)
  apiUrl = "http://localhost:5000";

  // 🔥 IMAGE PREVIEW
  previewImage: string | null = null;

  constructor(
    private reclamationService: ReclamationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getReclamations();
  }

  /* ================= GET ALL ================= */
  getReclamations(): void {
    this.loading = true;
    this.errorMessage = "";

    this.reclamationService.getReclamations().subscribe({
      next: (data: any) => {
        this.reclamations = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error("Erreur chargement réclamations:", err);
        this.errorMessage = "Erreur lors du chargement";
        this.loading = false;
      }
    });
  }

  /* ================= SELECT ================= */
  selectReclamation(rec: any): void {
    this.selectedReclamation = rec;
    this.successMessage = "";
    this.errorMessage = "";
  }

  /* ================= BACK ================= */
  backToList(): void {
    this.selectedReclamation = null;
    this.successMessage = "";
    this.errorMessage = "";
  }

  /* ================= IMAGE URL ================= */
  getImageUrl(path: string): string {
    if (!path) return "";

    return path.startsWith("uploads")
      ? `${this.apiUrl}/${path}`
      : `${this.apiUrl}/uploads/${path}`;
  }

  /* ================= IMAGE FALLBACK ================= */
  onImageError(event: any): void {
    event.target.src = "assets/img/no-image.png";
  }

  /* ================= HAS IMAGES ================= */
  hasImages(rec: any): boolean {
    return rec?.images && rec.images.length > 0;
  }

  /* ================= PREVIEW ================= */
  openPreview(img: string): void {
    this.previewImage = this.getImageUrl(img);
  }

  closePreview(): void {
    this.previewImage = null;
  }

  /* ================= ACCEPT ================= */
  accept(id: string): void {
    if (!id || this.actionLoading) return;

    this.actionLoading = true;
    this.successMessage = "";
    this.errorMessage = "";

    this.reclamationService.acceptReclamation(id).subscribe({
      next: () => {
        this.successMessage = "✅ Réclamation acceptée et intervention créée";

        // 🔥 Retrait immédiat de la liste locale
        this.reclamations = this.reclamations.filter(r => r._id !== id);

        // 🔥 Redirection vers /interventions après 1.5s
        setTimeout(() => {
          this.router.navigate(["/interventions"]);
          this.successMessage = "";
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "❌ Erreur lors de l'acceptation";
      },
      complete: () => {
        this.actionLoading = false;
      }
    });
  }

  /* ================= REFUSE ================= */
  refuse(id: string): void {
    if (!id || this.actionLoading) return;

    this.actionLoading = true;
    this.successMessage = "";
    this.errorMessage = "";

    this.reclamationService.refuseReclamation(id).subscribe({
      next: () => {
        this.errorMessage = "❌ Réclamation refusée";

        // 🔥 Retrait immédiat de la liste locale
        this.reclamations = this.reclamations.filter(r => r._id !== id);

        // 🔥 retour Automatique après 1.5s
        setTimeout(() => {
          this.backToList();
          this.errorMessage = "";
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "❌ Erreur lors du refus";
      },
      complete: () => {
        this.actionLoading = false;
      }
    });
  }

}