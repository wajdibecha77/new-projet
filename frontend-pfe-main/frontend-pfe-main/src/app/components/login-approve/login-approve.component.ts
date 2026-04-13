import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

@Component({
  selector: "app-login-approve",
  templateUrl: "./login-approve.component.html",
  styleUrls: ["./login-approve.component.scss"],
})
export class LoginApproveComponent implements OnInit {
  loading = true;
  message = "Validation de la connexion en cours...";
  error = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const cid = String(this.route.snapshot.queryParamMap.get("cid") || "");
    const token = String(this.route.snapshot.queryParamMap.get("token") || "");

    if (!cid || !token) {
      this.loading = false;
      this.error = "Lien invalide.";
      return;
    }

    this.authService.approveChallenge(cid, token).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message = res?.message || "Connexion approuvee.";
        const challengeId = String(res?.challengeId || cid);
        this.router.navigate(["/auth/signin"], {
          queryParams: { waiting: 1, challengeId },
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || "Impossible de valider la connexion.";
      },
    });
  }
}

