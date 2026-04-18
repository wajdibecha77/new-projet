import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

const ENABLE_OTP_LOGIN = false;

@Component({
  selector: "app-signin",
  templateUrl: "./signin.component.html",
  styleUrls: ["./signin.component.scss"],
})
export class SigninComponent {
  email = "";
  password = "";
  showPassword = false;
  loading = false;
  errorMessage = "";
  successMessage = "";
  private readonly technicianRoles = [
    "INFORMATICIEN",
    "ELECTRICIEN",
    "MECANICIEN",
    "PLOMBERIE",
    "TECHNICIEN",
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private isTechnicianRole(role: string): boolean {
    return this.technicianRoles.includes(String(role || "").toUpperCase());
  }

  private sanitizeLoginMessage(message?: string): string {
    const text = String(message || "");
    const looksLikeOtpMessage =
      /otp|verification|verif|vérif|challenge|code|e-mail/i.test(text);

    if (!ENABLE_OTP_LOGIN && looksLikeOtpMessage) {
      return "Connexion refusee.";
    }

    return text || "Connexion refusee.";
  }

  private goToHome(role: string): void {
    const normalizedRole = String(role || "").toUpperCase();

    if (normalizedRole === "ADMIN") {
      this.router.navigate(["/dashboard"]);
      return;
    }

    if (this.isTechnicianRole(normalizedRole)) {
      this.router.navigate(["/dashboard-client"]);
      return;
    }

    this.router.navigate(["/dashboard-visiteur"]);
  }

  onSignin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = "Remplissez tous les champs.";
      this.successMessage = "";
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.authService.loginSecure(this.email.trim(), this.password).subscribe({
      next: (res) => {
        this.loading = false;
        console.log("LOGIN RESPONSE:", res);

        const requiresOtp = !!(res?.requiresOtp || res?.challengeRequired);
        if (requiresOtp && ENABLE_OTP_LOGIN) {
          this.authService.clearTrustedDevice(this.email);
          this.router.navigate(["/auth/verify-otp"], {
            queryParams: {
              email: this.email.trim().toLowerCase(),
              challengeId: res?.challengeId || "",
            },
          });
          return;
        }

        if (!res?.token) {
          this.errorMessage = this.sanitizeLoginMessage(res?.message);
          return;
        }

        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res?.user || {}));
        const role = String(res?.user?.role || "").toUpperCase();
        localStorage.setItem("role", role);

        this.successMessage = "Connexion reussie.";
        this.goToHome(role);
      },
      error: (err) => {
        this.loading = false;
        this.successMessage = "";
        this.errorMessage = this.sanitizeLoginMessage(
          err?.error?.message || "Erreur lors de la connexion."
        );
      },
    });
  }
}

