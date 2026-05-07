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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log("[ConfirmLogin] Page loaded");

    const routeToken = String(this.route.snapshot.queryParamMap.get("token") || "").trim();
    console.log("[ConfirmLogin] Token from ActivatedRoute:", routeToken || "(empty)");

    let finalToken = routeToken;

    if (!finalToken) {
      const href = String(window.location.href || "");
      console.log("[ConfirmLogin] Fallback URL:", href);
      const match = href.match(/[?&]token=([^&#]+)/);
      if (match && match[1]) {
        finalToken = decodeURIComponent(match[1]).trim();
      }
    }

    console.log("[ConfirmLogin] Final token:", finalToken || "(empty)");

    if (!finalToken) {
      this.router.navigateByUrl("/login");
      return;
    }

    this.confirmLogin(finalToken);
  }

  confirmLogin(token: string): void {
    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.canUseOtpFallback = false;

    this.authService.confirmLogin(token).subscribe({
      next: (res: any) => {
        this.loading = false;
        console.log("[ConfirmLogin] API success:", res);

        if (!res?.success || !res?.token) {
          this.router.navigate(["/login"]);
          return;
        }

        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res?.user || {}));
        localStorage.setItem("role", String(res?.user?.role || "").toUpperCase());

        this.successMessage = "Connexion confirmee. Redirection...";
        window.location.href = "/#/dashboard";
      },
      error: (err) => {
        this.loading = false;
        console.error("[ConfirmLogin] API error:", err);
        this.router.navigate(["/login"]);
      },
    });
  }

  goToOtpFallback(): void {
    this.router.navigate(["/login"]);
  }
}
