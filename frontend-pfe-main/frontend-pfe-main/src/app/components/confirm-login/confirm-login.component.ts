import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

@Component({
  selector: "app-confirm-login",
  templateUrl: "./confirm-login.component.html",
  styleUrls: ["./confirm-login.component.scss"],
})
export class ConfirmLoginComponent implements OnInit {
  loading = true;
  errorMessage = "";
  successMessage = "";
  infoMessage = "Validation en cours...";
  canUseOtpFallback = false;
  otpEmail = "";
  private mobileFallbackTimer: any = null;
  private mobileRedirectHandled = false;

  private readonly technicianRoles = [
    "INFORMATICIEN",
    "ELECTRICIEN",
    "MECANICIEN",
    "PLOMBERIE",
    "TECHNICIEN",
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = String(params?.token || "").trim();
      if (!token) {
        this.loading = false;
        this.errorMessage = "Lien de confirmation invalide.";
        return;
      }

      if (this.isMobileDevice()) {
        this.tryOpenMobileApp(token);
        return;
      }

      this.confirmLogin(token);
    });
  }

  confirmLogin(token: string): void {
    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.canUseOtpFallback = false;

    this.authService.confirmLogin(token).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success || !res?.token) {
          this.errorMessage = "Reponse invalide du serveur.";
          return;
        }

        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res?.user || {}));
        const role = String(res?.user?.role || "").toUpperCase();
        localStorage.setItem("role", role);

        this.successMessage = "Connexion confirmee. Redirection...";
        this.authService.markTrustedDevice(String(res?.user?.email || ""));
        this.goToHome(role);
      },
      error: (err) => {
        this.loading = false;
        const apiError = err?.error || {};
        if (apiError?.requiresOtp) {
          this.canUseOtpFallback = true;
          this.otpEmail = String(apiError?.email || "");
          this.errorMessage = apiError?.message || "Lien expire. OTP requis.";
          return;
        }

        this.errorMessage = apiError?.message || "Echec de confirmation de connexion.";
      },
    });
  }

  goToOtpFallback(): void {
    this.router.navigate(["/auth/login-verify-otp"], {
      queryParams: { email: this.otpEmail || "" },
    });
  }

  private isTechnicianRole(role: string): boolean {
    return this.technicianRoles.includes(String(role || "").toUpperCase());
  }

  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || "";
    return /android|iphone|ipad|ipod/i.test(userAgent);
  }

  private tryOpenMobileApp(token: string): void {
    if (this.mobileRedirectHandled) {
      return;
    }
    this.mobileRedirectHandled = true;

    const appUrl = `myapp://confirm-login?token=${encodeURIComponent(token)}`;
    this.infoMessage = "Ouverture de l'application mobile...";

    const cancelFallback = () => {
      if (this.mobileFallbackTimer) {
        clearTimeout(this.mobileFallbackTimer);
        this.mobileFallbackTimer = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", cancelFallback);
      window.removeEventListener("blur", cancelFallback);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cancelFallback();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cancelFallback);
    window.addEventListener("blur", cancelFallback);

    this.mobileFallbackTimer = setTimeout(() => {
      cancelFallback();
      this.infoMessage = "Validation en cours...";
      this.confirmLogin(token);
    }, 2000);

    window.location.href = appUrl;
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
}
