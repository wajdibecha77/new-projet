import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { AuthService } from "src/app/services/auth.service";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-login-verify",
  templateUrl: "./login-verify.component.html",
  styleUrls: ["./login-verify.component.scss"],
})
export class LoginVerifyComponent implements OnInit {
  public email: string = "";
  public otp: string = "";
  public challengeId: string = "";
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
    private authService: AuthService,
    private userService: UserService,
    private notifier: NotifierService
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get("email") || "";
    this.challengeId =
      this.route.snapshot.queryParamMap.get("challengeId") || "";
  }

  private isTechnicianRole(role: string): boolean {
    return this.technicianRoles.includes(String(role || "").toUpperCase());
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

  verify() {
    if (this.challengeId) {
      this.authService.verifyLoginOtp(this.challengeId, this.otp).subscribe({
        next: (res: any) => {
          if (res?.token) {
            localStorage.setItem("token", res.token);
            localStorage.setItem("user", JSON.stringify(res?.user || {}));
            const role = String(res?.user?.role || "").toUpperCase();
            localStorage.setItem("role", role);
            this.authService.markTrustedDevice(this.email);
            this.goToHome(role);
            return;
          }

          this.notifier.show({
            type: "error",
            message: "Code invalide",
            id: "OTP_INVALID",
          });
        },
        error: () => {
          this.notifier.show({
            type: "error",
            message: "Code invalide",
            id: "OTP_INVALID",
          });
        },
      });
      return;
    }

    this.userService
      .verifyLoginOtp({
        email: this.email,
        otp: this.otp,
      })
      .subscribe({
        next: () => {
          this.router.navigate(["/auth/signin"]);
        },
        error: () => {
          this.notifier.show({
            type: "error",
            message: "Code invalide",
            id: "OTP_INVALID",
          });
        },
      });
  }
}
