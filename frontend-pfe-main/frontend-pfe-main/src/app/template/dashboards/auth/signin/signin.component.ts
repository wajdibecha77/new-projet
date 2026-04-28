import { Component, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

const ENABLE_OTP_LOGIN = false;

@Component({
  selector: "app-signin",
  templateUrl: "./signin.component.html",
  styleUrls: ["./signin.component.scss"],
})
export class SigninComponent implements OnDestroy {
  email = "";
  password = "";
  showPassword = false;
  loading = false;
  errorMessage = "";
  successMessage = "";
  emailSent = false;
  user: any = {};
  private emailSentTimeout?: ReturnType<typeof setTimeout>;
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
  ) {
    this.user = JSON.parse(localStorage.getItem("user") || "{}");
    console.log("USER FROM LOCALSTORAGE =", this.user);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy(): void {
    if (this.emailSentTimeout) {
      clearTimeout(this.emailSentTimeout);
    }
  }

  private showEmailConfirmationAlert(): void {
    this.emailSent = true;
    if (this.emailSentTimeout) {
      clearTimeout(this.emailSentTimeout);
    }
    this.emailSentTimeout = setTimeout(() => {
      this.emailSent = false;
    }, 5000);
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
    this.emailSent = false;

    this.authService.loginSecure(this.email.trim(), this.password).subscribe({
      next: (res) => {
        this.loading = false;
        console.log("LOGIN RESPONSE:", res);

        // CASE 1: trusted device (or already confirmed) => direct JWT login
        if (res?.token) {
          localStorage.setItem("token", res.token);
          localStorage.setItem("user", JSON.stringify(res?.user || {}));
          const role = String(res?.user?.role || "").toUpperCase();
          localStorage.setItem("role", role);

          this.emailSent = false;
          this.successMessage = "Connexion reussie.";
          this.goToHome(role);
          return;
        }

        // CASE 2: new/unknown device => user must confirm from email link
        if (res?.requiresEmailConfirmation) {
          this.successMessage = "";
          this.errorMessage = "";
          this.showEmailConfirmationAlert();
          return;
        }

        // Keep OTP flow untouched for compatibility with older flows.
        const requiresOtp = !!(res?.requiresOtp || res?.challengeRequired);
        if (requiresOtp && ENABLE_OTP_LOGIN) {
          this.authService.clearTrustedDevice(this.email);
          this.router.navigate(["/auth/login-verify-otp"], {
            queryParams: {
              email: this.email.trim().toLowerCase(),
              challengeId: res?.challengeId || "",
            },
          });
          return;
        }

        // CASE 3: server-side validation/auth error
        this.errorMessage = this.sanitizeLoginMessage(res?.message);
      },
      error: (err) => {
        this.loading = false;
        this.emailSent = false;
        this.successMessage = "";
        this.errorMessage = this.sanitizeLoginMessage(
          err?.error?.message || "Erreur lors de la connexion."
        );
      },
    });
  }
}
