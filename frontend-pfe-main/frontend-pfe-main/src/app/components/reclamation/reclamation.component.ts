import { Component, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { ReclamationService } from "src/app/services/reclamation.service";

@Component({
  selector: "app-reclamation",
  templateUrl: "./reclamation.component.html",
  styleUrls: ["./reclamation.component.scss"],
})
export class ReclamationComponent implements OnDestroy {

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
  @ViewChild("cameraVideo") cameraVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild("cameraCanvas") cameraCanvas!: ElementRef<HTMLCanvasElement>;

  cameraStream: MediaStream | null = null;
  cameraOpen = false;
  cameraLoading = false;

  constructor(private service: ReclamationService) {}

  ngOnDestroy(): void {
    this.stopCamera();
  }

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
    const preview = this.imagesPreview[index];
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    this.selectedFiles.splice(index, 1);
    this.imagesPreview.splice(index, 1);
  }

  async openCamera() {
    this.errorMessage = "";

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.errorMessage = "Camera non supportee par ce navigateur.";
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
      console.error("Camera error:", error);
      this.errorMessage = "Impossible d'ouvrir la camera. Verifiez les permissions.";
      this.cameraOpen = false;
      this.stopCamera();
    } finally {
      this.cameraLoading = false;
    }
  }

  stopCamera() {
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

  captureFromCamera() {
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

        const fileName = `camera-${Date.now()}.jpg`;
        const imageFile = new File([blob], fileName, { type: "image/jpeg" });

        this.selectedFiles.push(imageFile);
        this.imagesPreview.push(URL.createObjectURL(imageFile));
      },
      "image/jpeg",
      0.9
    );
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
    this.imagesPreview.forEach((preview) => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    });

    this.selectedFiles = [];
    this.imagesPreview = [];
    this.loading = false;
    this.stopCamera();

    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }
}
