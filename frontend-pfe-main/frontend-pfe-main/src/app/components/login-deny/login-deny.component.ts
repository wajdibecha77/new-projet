import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

@Component({
  selector: "app-login-deny",
  templateUrl: "./login-deny.component.html",
  styleUrls: ["./login-deny.component.scss"],
})
export class LoginDenyComponent implements OnInit {
  loading = true;
  message = "Refus de la connexion en cours...";
  error = "";

  constructor(private route: ActivatedRoute, private authService: AuthService) {}

  ngOnInit(): void {
    const cid = String(this.route.snapshot.queryParamMap.get("cid") || "");
    const token = String(this.route.snapshot.queryParamMap.get("token") || "");

    if (!cid || !token) {
      this.loading = false;
      this.error = "Lien invalide.";
      return;
    }

    this.authService.denyChallenge(cid, token).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message =
          res?.message || "Connexion refusee. Si ce n'etait pas vous, changez votre mot de passe.";
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || "Impossible de refuser la connexion.";
      },
    });
  }
}

