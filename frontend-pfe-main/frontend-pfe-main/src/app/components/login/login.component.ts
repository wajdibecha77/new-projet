import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

const ENABLE_OTP_LOGIN = false;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class LoginComponent implements OnInit {

  email = '';
  password = '';

  private readonly technicianRoles = [
    'INFORMATICIEN',
    'ELECTRICIEN',
    'MECANICIEN',
    'PLOMBERIE',
    'TECHNICIEN'
  ];

  waitingVerification = false;
  challengeId = '';
  otp = '';

  messageFR = '';
  errorFR = '';
  loading = false;
  showPassword = false;
  user: any = {};

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // ✅ FIXED (no more fake "Connexion refusée")
  private sanitizeLoginMessage(message?: string): string {
    return message || 'Connexion refusée';
  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log("USER FROM LOCALSTORAGE =", this.user);

    if (!ENABLE_OTP_LOGIN) return;

    this.route.queryParamMap.subscribe((params) => {
      const waiting = params.get('waiting');
      const cid = params.get('challengeId');

      if (waiting === '1' && cid) {
        this.waitingVerification = true;
        this.challengeId = cid;
        this.messageFR =
          "En attente de verification. Un e-mail de confirmation a ete envoye.";
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

  // 📍 GPS (optional)
  private getGpsAddress(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`;

          this.http.get<any>(url).subscribe(
            (data) => resolve(data?.display_name || null),
            () => resolve(null)
          );
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ================= LOGIN =================
  onLogin(): void {
    this.loading = true;
    this.errorFR = '';
    this.messageFR = '';

    this.getGpsAddress().then((gpsLocation) => {
      this.auth.loginSecure(this.email, this.password, gpsLocation || undefined)
        .subscribe({
          next: (res: any) => {
            this.loading = false;

            // CASE 1: trusted device (or already confirmed) => direct JWT login
            if (res?.token) {
              this.auth.markTrustedDevice(this.email);

              const role = this.resolveRole(res?.user);

              localStorage.setItem('token', res.token);
              localStorage.setItem('user', JSON.stringify(res?.user || {}));
              localStorage.setItem('role', role);

              this.goToHome(res?.user);
              return;
            }

            // CASE 2: new/unknown device => email confirmation required
            if (res?.requiresEmailConfirmation) {
              this.messageFR = "Verifiez votre email pour confirmer la connexion.";
              return;
            }

            // CASE 3: server-side validation/auth error
            this.errorFR = res?.message || "Connexion refusée";
          },

          error: (err) => {
            this.loading = false;
            this.errorFR =
              err?.error?.message || "Erreur lors de la connexion.";
          },
        });
    });
  }

  // ================= OTP =================
  onVerifyOtp(): void {
    if (!this.challengeId) {
      this.errorFR = "ChallengeId manquant.";
      return;
    }

    this.loading = true;
    this.errorFR = '';

    this.auth.verifyLoginOtp(this.challengeId, this.otp)
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          if (res?.token) {
            this.auth.markTrustedDevice(this.email);

            const role = this.resolveRole(res?.user);

            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res?.user || {}));
            localStorage.setItem('role', role);

            this.goToHome(res?.user);
          } else {
            this.errorFR = "Code incorrect ou expiré.";
          }
        },

        error: (err) => {
          this.loading = false;
          this.errorFR =
            err?.error?.message || "Erreur de verification.";
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
