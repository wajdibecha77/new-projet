import { Component, OnDestroy, OnInit } from "@angular/core";
import { NgForm } from "@angular/forms";
import { Router } from "@angular/router";
import { ReclamationService } from "src/app/services/reclamation.service";

interface ReclamationPublicFormData {
  nom: string;
  prenom: string;
  email: string;
  nationalite: string;
  langue: string;
  typeIntervention: string;
  typeInterventionAutre: string;
  description: string;
  images: File[];
}

@Component({
  selector: "app-reclamation-public",
  templateUrl: "./reclamation-public.component.html",
  styleUrls: ["./reclamation-public.component.scss"],
})
export class ReclamationPublicComponent implements OnInit, OnDestroy {
  public nationalites: string[] = [
    "Tunisie",
    "France",
    "Algerie",
    "Maroc",
    "Italie",
    "Espagne",
    "Allemagne",
    "Royaume-Uni",
    "Etats-Unis",
    "Canada",
  ];

  public langues: string[] = [
    "Français",
    "English",
    "Deutsch",
    "Español",
    "Italiano",
  ];

  public typesIntervention: string[] = [
    "Electrique",
    "Plomberie",
    "Informatique",
    "Mecanique",
    "Autre",
  ];

  public formData: ReclamationPublicFormData = this.createEmptyForm();
  public submitSuccess = false;
  public trackingCode = "";
  public lastCode = "";
  public submitError = "";
  public isSubmitting = false;
  public showToast = false;

  private toastTimer: any = null;

  constructor(
    private reclamationService: ReclamationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const savedCode = localStorage.getItem("lastCode");
    if (savedCode) {
      this.lastCode = savedCode;
    }
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.formData.images = files;
  }

  onSubmit(form: NgForm): void {
    this.submitSuccess = false;
    this.trackingCode = "";
    this.submitError = "";

    if (form.invalid) {
      Object.keys(form.controls).forEach((key) => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    if (this.formData.typeIntervention === "Autre" && !this.formData.typeInterventionAutre.trim()) {
      return;
    }

    const selectedType =
      this.formData.typeIntervention === "Autre"
        ? this.formData.typeInterventionAutre.trim()
        : this.formData.typeIntervention;

    const payload = new FormData();
    payload.append("nom", this.formData.nom);
    payload.append("prenom", this.formData.prenom);
    payload.append("email", this.formData.email);
    payload.append("nationalite", this.formData.nationalite);
    payload.append("langue", this.formData.langue);
    payload.append("typeIntervention", selectedType);
    payload.append("description", this.formData.description);

    this.formData.images.forEach((file) => {
      payload.append("images", file);
    });

    this.isSubmitting = true;

    this.reclamationService.addReclamation(payload, true).subscribe({
      next: (response) => {
        this.submitSuccess = true;
        this.trackingCode = String(response?.code || "");
        this.lastCode = this.trackingCode;

        if (this.lastCode) {
          localStorage.setItem("lastCode", this.lastCode);
          this.openToast();
        }

        form.resetForm();
        this.formData = this.createEmptyForm();
        this.isSubmitting = false;
      },
      error: (error) => {
        this.isSubmitting = false;
        this.submitError = error?.error?.msg || "Envoi impossible pour le moment. Veuillez reessayer.";
      },
    });
  }

  goToTracking(): void {
    const code = this.lastCode || this.trackingCode;
    if (!code) return;

    this.router.navigate(["/suivi-reclamation"], {
      queryParams: { code },
    });
  }

  private openToast(): void {
    this.showToast = true;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 5000);
  }

  private createEmptyForm(): ReclamationPublicFormData {
    return {
      nom: "",
      prenom: "",
      email: "",
      nationalite: "",
      langue: "",
      typeIntervention: "",
      typeInterventionAutre: "",
      description: "",
      images: [],
    };
  }
}
