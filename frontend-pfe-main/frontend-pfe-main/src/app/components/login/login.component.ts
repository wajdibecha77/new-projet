import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  private readonly technicianRoles = ['INFORMATICIEN', 'ELECTRICIEN', 'MECANICIEN', 'PLOMBERIE', 'TECHNICIEN'];

  waitingVerification = false;
  challengeId = '';
  otp = '';
  messageFR = '';
  errorFR = '';
  loading = false;
  showPassword = false;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const waiting = params.get('waiting');
      const cid = params.get('challengeId');

      if (waiting === '1' && cid) {
        this.waitingVerification = true;
        this.challengeId = cid;
        this.messageFR =
          "En attente de vérification… Un e-mail de confirmation a été envoyé. Cliquez sur “C’est moi”, puis saisissez le code reçu.";
      }
    });
  }

  private resolveRole(user?: any): string {
    return String(user?.role || localStorage.getItem('role') || '').toUpperCase();
  }

  private goToHome(user?: any) {
    const role = this.resolveRole(user);

    if (role === 'ADMIN') {
      this.router.navigate(['/dashboard']);
    } else if (this.isTechnicianRole(role)) {
      this.router.navigate(['/dashboard-client']);
    } else {
      this.router.navigate(['/dashboard-visiteur']);
    }
  }

  private isTechnicianRole(role: string): boolean {
    return this.technicianRoles.includes(String(role || '').toUpperCase());
  }

  onLogin(): void {
    this.loading = true;
    this.errorFR = '';
    this.messageFR = '';

    this.auth.loginSecure(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;

        if (res?.challengeRequired) {
          this.auth.clearTrustedDevice(this.email);
          this.waitingVerification = true;
          this.challengeId = res.challengeId;
          this.messageFR =
            res.message ||
            "Vérification de connexion requise. Un e-mail vous a été envoyé.";
          return;
        }

        if (res?.token) {
          this.auth.markTrustedDevice(this.email);
          const role = this.resolveRole(res?.user);
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res?.user || {}));
          localStorage.setItem("role", role);
          this.goToHome(res?.user);
          return;
        }

        this.errorFR = "Réponse inattendue du serveur.";
      },
      error: (err) => {
        this.loading = false;
        this.errorFR = err?.error?.message || "Erreur lors de la connexion.";
      },
    });
  }

  onVerifyOtp(): void {
    if (!this.challengeId) {
      this.errorFR = "ChallengeId manquant.";
      return;
    }

    this.loading = true;
    this.errorFR = '';

    this.auth.verifyLoginOtp(this.challengeId, this.otp).subscribe({
      next: (res) => {
        this.loading = false;

        if (res?.token) {
          this.auth.markTrustedDevice(this.email);
          const role = this.resolveRole(res?.user);
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res?.user || {}));
          localStorage.setItem("role", role);
          this.goToHome(res?.user);
        } else {
          this.errorFR = "Code incorrect ou expiré.";
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorFR = err?.error?.message || "Erreur de vérification.";
      },
    });
  }

  cancelVerification(): void {
    this.waitingVerification = false;
    this.otp = '';
    this.challengeId = '';
    this.messageFR = '';
    this.errorFR = '';
  }
}
