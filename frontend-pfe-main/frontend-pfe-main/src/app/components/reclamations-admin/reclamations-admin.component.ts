import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ReclamationService } from "src/app/services/reclamation.service";
import { environment } from "src/environments/environment";

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

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ API URL (Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¶Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  environmentÃƒËœÃ…â€™ ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¨)
  apiUrl = environment.apiUrl;

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ IMAGE PREVIEW
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
        console.error("Erreur chargement rÃƒÆ’Ã‚Â©clamations:", err);
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
        this.successMessage = "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ RÃƒÆ’Ã‚Â©clamation acceptÃƒÆ’Ã‚Â©e et intervention crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©e";

        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ Retrait immÃƒÆ’Ã‚Â©diat de la liste locale
        this.reclamations = this.reclamations.filter(r => r._id !== id);

        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ Redirection vers /interventions aprÃƒÆ’Ã‚Â¨s 1.5s
        setTimeout(() => {
          this.router.navigate(["/interventions"]);
          this.successMessage = "";
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur lors de l'acceptation";
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
        this.errorMessage = "ÃƒÂ¢Ã‚ÂÃ…â€™ RÃƒÆ’Ã‚Â©clamation refusÃƒÆ’Ã‚Â©e";

        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ Retrait immÃƒÆ’Ã‚Â©diat de la liste locale
        this.reclamations = this.reclamations.filter(r => r._id !== id);

        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ retour Automatique aprÃƒÆ’Ã‚Â¨s 1.5s
        setTimeout(() => {
          this.backToList();
          this.errorMessage = "";
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur lors du refus";
      },
      complete: () => {
        this.actionLoading = false;
      }
    });
  }

}