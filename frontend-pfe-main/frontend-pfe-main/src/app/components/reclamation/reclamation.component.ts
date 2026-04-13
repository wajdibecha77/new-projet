import { Component, ViewChild, ElementRef } from "@angular/core";
import { ReclamationService } from "src/app/services/reclamation.service";

@Component({
  selector: "app-reclamation",
  templateUrl: "./reclamation.component.html",
  styleUrls: ["./reclamation.component.scss"],
})
export class ReclamationComponent {

  description: string = "";
  lieu: string = "";
  problemType: string = "";
  urgence: string = "";
  contact: string = "";

  loading: boolean = false;

  selectedFiles: File[] = [];
  imagesPreview: string[] = [];

  successMessage: string = "";
  errorMessage: string = "";

  @ViewChild("fileInput") fileInput!: ElementRef;

  constructor(private service: ReclamationService) {}

  setProblemType(type: string) {
    this.problemType = type;
  }

  setUrgence(level: string) {
    this.urgence = level;
  }

  /* 📷 SELECT MULTIPLE IMAGES */
  onFileSelected(event: any) {
    try {
      const files: FileList = event.target.files;

      if (!files || files.length === 0) return;

      Array.from(files).forEach((file: File) => {
        this.selectedFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagesPreview.push(e.target.result);
        };
        reader.readAsDataURL(file);
      });

      this.fileInput.nativeElement.value = "";

    } catch (e) {
      console.error("Image error:", e);
    }
  }

  /* ❌ REMOVE IMAGE */
  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.imagesPreview.splice(index, 1);
  }

  /* 🚀 SUBMIT */
  submit() {

    this.successMessage = "";
    this.errorMessage = "";

    if (!this.description || !this.description.trim()) {
      this.errorMessage = "Description obligatoire ❗";
      return;
    }

    if (this.loading) return;

    this.loading = true;

    const formData = new FormData();

    formData.append("description", this.description.trim());
    formData.append("lieu", this.lieu?.trim() || "");
    formData.append("problemType", this.problemType || "");
    formData.append("urgence", this.urgence || "");
    formData.append("contact", this.contact?.trim() || "");

    // 🔥 Multiple images (backend: upload.array("images", 5))
    this.selectedFiles.forEach((file: File) => {
      formData.append("images", file);
    });

    this.service.addReclamation(formData).subscribe({
      next: () => {
        this.successMessage = "Réclamation envoyée avec succès ✅";

        this.resetForm();

        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
      },

      error: (err) => {
        console.error("ERROR RECLAMATION", err);

        if (err?.status === 401) {
          this.errorMessage = "Session expirée ❗ reconnectez-vous";
        } else {
          this.errorMessage = "Erreur serveur ❌";
        }

        this.loading = false;
      },

      complete: () => {
        this.loading = false;
      }
    });
  }

  /* 🔄 RESET */
  resetForm() {
    this.description = "";
    this.lieu = "";
    this.problemType = "";
    this.urgence = "";
    this.contact = "";
    this.selectedFiles = [];
    this.imagesPreview = [];
    this.loading = false;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }
}
