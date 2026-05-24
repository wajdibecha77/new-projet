import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
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
  @ViewChild("imagesInput") imagesInput!: ElementRef<HTMLInputElement>;
  @ViewChild("cameraVideo") cameraVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild("cameraCanvas") cameraCanvas!: ElementRef<HTMLCanvasElement>;

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
  public imagePreviews: string[] = [];
  public cameraOpen = false;
  public cameraLoading = false;

  private cameraStream: MediaStream | null = null;

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
    this.stopCamera();
    this.clearPreviews();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];

    files.forEach((file) => {
      this.formData.images.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    });

    if (this.imagesInput?.nativeElement) {
      this.imagesInput.nativeElement.value = "";
    }
  }

  removeImage(index: number): void {
    const preview = this.imagePreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    this.formData.images.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  async openCamera(): Promise<void> {
    this.submitError = "";

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.submitError = "Camera non supportee par ce navigateur.";
      return;
    }

    if (this.cameraOpen) return;
    this.cameraLoading = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      this.cameraStream = stream;
      this.cameraOpen = true;

      setTimeout(() => {
        if (this.cameraVideo?.nativeElement) {
          this.cameraVideo.nativeElement.srcObject = stream;
          this.cameraVideo.nativeElement.play().catch(() => null);
        }
      });
    } catch (error) {
      this.submitError = "Impossible d'ouvrir la camera. Verifiez les permissions.";
      this.stopCamera();
    } finally {
      this.cameraLoading = false;
    }
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }

    if (this.cameraVideo?.nativeElement) {
      this.cameraVideo.nativeElement.srcObject = null;
    }

    this.cameraOpen = false;
    this.cameraLoading = false;
  }

  captureFromCamera(): void {
    if (!this.cameraVideo?.nativeElement || !this.cameraCanvas?.nativeElement) {
      return;
    }

    const video = this.cameraVideo.nativeElement;
    const canvas = this.cameraCanvas.nativeElement;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        this.formData.images.push(file);
        this.imagePreviews.push(URL.createObjectURL(file));
      },
      "image/jpeg",
      0.9
    );
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
        this.stopCamera();
        this.clearPreviews();
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

  private clearPreviews(): void {
    this.imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    this.imagePreviews = [];
  }
}
