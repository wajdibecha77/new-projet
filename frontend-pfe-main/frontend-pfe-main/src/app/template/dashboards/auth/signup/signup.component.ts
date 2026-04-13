import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

@Component({
  selector: "app-signup",
  templateUrl: "./signup.component.html",
  styleUrls: ["./signup.component.scss"],
})
export class SignupComponent {

  name = "";
  email = "";
  password = "";
  gender = "HOMME";
  birthDate = "";
  loading = false;

  // ✅ messages
  successMessage = "";
  errorMessage = "";

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSignup() {

    // ✅ validation
    if (!this.name || !this.email || !this.password) {
      this.errorMessage = "Remplissez tous les champs ❗";
      this.successMessage = "";
      return;
    }

    this.loading = true;

    this.authService.signup({
      name: this.name.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password
    }).subscribe({
      next: () => {

        this.loading = false;

        // ✅ message vert
        this.successMessage = "Compte créé avec succès ✅";
        this.errorMessage = "";

        // reset form
        this.name = "";
        this.email = "";
        this.password = "";
        this.birthDate = "";

        // ⏳ redirect بعد شوية
        setTimeout(() => {
          this.router.navigate(["/auth/signin"]);
        }, 2000);
      },

      error: (err) => {

        this.loading = false;

        console.error("SIGNUP ERROR 👉", err);

        this.successMessage = "";
        this.errorMessage =
          err?.error?.message ||
          "Erreur lors de la création du compte ❌";
      },
    });
  }
}