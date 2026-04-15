import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private API = `${environment.apiUrl}/auth`;
  private readonly deviceIdStorageKey = 'trusted_device_id';

  constructor(private http: HttpClient) {
    console.log('🔥 AUTH API =', this.API);
  }

  // ================= HELPERS =================

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private getCurrentUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  }

  /* 🔥 FIX FINAL (Angular 9 compatible) */
  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem(this.deviceIdStorageKey);
    if (id) return id;

    // ✅ simple + stable
    id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    localStorage.setItem(this.deviceIdStorageKey, id);
    return id;
  }

  private getTrustedDeviceFlagKey(email: string): string {
    return `trusted:${this.normalizeEmail(email)}:${this.getOrCreateDeviceId()}`;
  }

  isTrustedDeviceLocally(email: string): boolean {
    return localStorage.getItem(this.getTrustedDeviceFlagKey(email)) === 'true';
  }

  markTrustedDevice(email: string): void {
    localStorage.setItem(this.getTrustedDeviceFlagKey(email), 'true');
  }

  clearTrustedDevice(email: string): void {
    localStorage.removeItem(this.getTrustedDeviceFlagKey(email));
  }

  private storeTokenIfPresent(res: any): void {
    if (res?.token) {
      localStorage.setItem("token", res.token);
    }
  }

  // ================= AUTH =================

  loginSecure(
    email: string,
    password: string,
    coords?: { lat: number; lng: number; accuracy?: number }
  ): Observable<any> {

    return this.http
      .post(`${this.API}/login-secure`, {
        email: this.normalizeEmail(email),
        password,
        coords,
        deviceInfo: {
          deviceId: this.getOrCreateDeviceId(),
          userAgent: this.getCurrentUserAgent(),
          trustedDevice: this.isTrustedDeviceLocally(email),
        },
      })
      .pipe(tap((res: any) => this.storeTokenIfPresent(res)));
  }

  verifyLoginOtp(challengeId: string, otp: string): Observable<any> {
    return this.http
      .post(`${this.API}/challenge/verify`, {
        challengeId,
        otp,
      })
      .pipe(tap((res: any) => this.storeTokenIfPresent(res)));
  }

  // ================= RESET =================

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API}/forgot-password`, {
      email: this.normalizeEmail(email),
    });
  }

  verifyResetCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.API}/verify-reset-code`, {
      email: this.normalizeEmail(email),
      code,
    });
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API}/reset-password`, {
      email: this.normalizeEmail(email),
      code,
      newPassword,
    });
  }

  // ================= SIGNUP =================

  signup(data: any): Observable<any> {
    data.email = this.normalizeEmail(data.email);
    return this.http.post(`${this.API}/signup`, data);
  }
}
