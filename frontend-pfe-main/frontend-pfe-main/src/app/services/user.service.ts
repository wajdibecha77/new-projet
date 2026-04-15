import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class UserService {

  // Ã°Å¸â€Â¥ API (web + mobile)
  public base_Url = environment.apiUrl;
  public isConnected: boolean = false;

  private readonly profileImageStorageKey = "profile_image";
  private readonly profileImageSubject = new BehaviorSubject<string | null>(
    localStorage.getItem(this.profileImageStorageKey)
  );
  public readonly profileImage$ = this.profileImageSubject.asObservable();

  constructor(private http: HttpClient) {}

  public setProfileImage(image: string | null): void {
    if (image) {
      localStorage.setItem(this.profileImageStorageKey, image);
    } else {
      localStorage.removeItem(this.profileImageStorageKey);
    }
    this.profileImageSubject.next(image);
  }

  public getProfileImageSnapshot(): string | null {
    return this.profileImageSubject.value;
  }

  public buildProfileImageUrl(image: string | null): string | null {
    if (!image) return null;
    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:") ||
      image.startsWith("assets/")
    ) {
      return image;
    }

    return `${environment.apiUrl.replace("/api", "")}/uploads/${image}`;
  }

  // ================= AUTH =================

  public login(email: string, password: string) {
    return this.http.post(`${this.base_Url}/users/login`, {
      email,
      password,
    });
  }

  public loginSecure(payload: { email: string; password: string }) {
    return this.http.post(`${this.base_Url}/auth/login-secure`, payload);
  }

  public verifyLoginOtp(payload: { email: string; otp: string }) {
    return this.http.post(`${this.base_Url}/auth/challenge/verify`, payload);
  }

  // ================= PASSWORD RESET =================

  public forgotPassword(email: string) {
    return this.http.post(`${this.base_Url}/users/forgot-password/request`, {
      email,
    });
  }

  public verifyForgotPasswordOtp(email: string, otp: string) {
    return this.http.post(`${this.base_Url}/users/forgot-password/verify`, {
      email,
      otp,
    });
  }

  public resendForgotPasswordOtp(email: string) {
    return this.http.post(`${this.base_Url}/users/forgot-password/resend`, {
      email,
    });
  }

  public resetPasswordWithOtp(
    email: string,
    resetToken: string,
    newPassword: string,
    confirmPassword: string
  ) {
    return this.http.post(`${this.base_Url}/users/forgot-password/reset`, {
      email,
      resetToken,
      newPassword,
      confirmPassword,
    });
  }

  // ================= USER =================

  public getConnectedUser() {
    return this.http.get(`${this.base_Url}/users/me`);
  }

  public getAllUsers() {
    return this.http.get(`${this.base_Url}/users`);
  }

  public getUserById(id: string) {
    return this.http.get(`${this.base_Url}/users/get/${id}`);
  }

  public createUser(account: any) {
    return this.http.post(`${this.base_Url}/users/createuser`, account);
  }

  public updateUser(id: string, account: any) {
    return this.http.put(`${this.base_Url}/users/update/${id}`, account);
  }

  public deleteUser(id: string) {
    return this.http.delete(`${this.base_Url}/users/delete/${id}`);
  }

  // ================= PROFILE (NEW) =================
  
  public getProfile() {
    return this.http.get(`${this.base_Url}/users/profile`);
  }

  public updateProfile(formData: FormData) {
    return this.http.put(`${this.base_Url}/users/profile`, formData);
  }

  public changePassword(passwordData: any) {
    return this.http.put(`${this.base_Url}/users/profile/password`, passwordData);
  }

  // ================= FOURNISSEURS =================

  public createFournisseur(account: any) {
    return this.http.post(`${this.base_Url}/users/createFournisseur`, account);
  }

  public getAllFournisseurs() {
    return this.http.get(`${this.base_Url}/users/getAllFournisseurs`);
  }

  public getFournisseurById(id: string) {
    return this.http.get(`${this.base_Url}/users/getFournisseur/${id}`);
  }

  public updateFournisseur(id: string, fournisseur: any) {
    return this.http.put(`${this.base_Url}/users/updateFournisseur/${id}`, fournisseur);
  }

  public deleteFournisseur(id: string) {
    return this.http.delete(`${this.base_Url}/users/deleteFournisseur/${id}`);
  }
}
