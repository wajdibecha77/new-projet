import { Component, OnInit } from "@angular/core";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-user-profile",
  templateUrl: "./user-profile.component.html",
  styleUrls: ["./user-profile.component.scss"],
})
export class UserProfileComponent implements OnInit {
  public token?: any = localStorage.getItem("token");
  public isConnected: boolean = false;
  public successMsg: String = "";
  public errorMsg: String = "";
  public account: any = {};
  public isSubmitting: boolean = false;
  
  public activeTab: string = 'info';
  public passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  public selectedFile: File | null = null;
  public imagePreview: string | ArrayBuffer | null = null;
  
  public getImageUrl() {
    if (this.imagePreview) return this.imagePreview;
    if (this.account?.image) return this.userService.buildProfileImageUrl(this.account.image);
    return null;
  }

  constructor(private userService: UserService) {
    this.isConnected = this.userService.isConnected;
  }

  ngOnInit() {
    if (this.token) {
      this.isConnected = true;
      this.loadProfile();
    }
  }

  loadProfile() {
    this.userService.getProfile().subscribe(
      (res: any) => {
        this.account = res?.data || {};
        this.userService.setProfileImage(this.account?.image || null);
      },
      (err) => {
        console.error("Erreur chargement profil", err);
      }
    );
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  update() {
    this.successMsg = "";
    this.errorMsg = "";
    this.isSubmitting = true;

    const formData = new FormData();
    if (this.account.name) formData.append("name", this.account.name);
    if (this.account.email) formData.append("email", this.account.email);
    if (this.account.phone) formData.append("phone", this.account.phone);
    if (this.account.address) formData.append("address", this.account.address);
    if (this.selectedFile) {
      formData.append("image", this.selectedFile);
    }

    this.userService.updateProfile(formData).subscribe(
      (res: any) => {
        this.account = res?.data || this.account;
        this.userService.setProfileImage(this.account?.image || null);
        this.successMsg = "Profil mis à jour avec succès.";
        this.isSubmitting = false;
      },
      (err: any) => {
        console.error("Erreur de mise à jour reçue :", err);
        this.errorMsg = err?.error?.message || err?.message || "Échec de mise à jour du profil.";
        this.isSubmitting = false;
      }
    );
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.successMsg = "";
    this.errorMsg = "";
  }

  changePassword() {
    this.successMsg = "";
    this.errorMsg = "";

    if (!this.passwordData.currentPassword || !this.passwordData.newPassword || !this.passwordData.confirmPassword) {
      this.errorMsg = "Veuillez remplir tous les champs.";
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.errorMsg = "Les nouveaux mots de passe ne correspondent pas.";
      return;
    }

    if (this.passwordData.newPassword.length < 8) {
      this.errorMsg = "Le mot de passe doit contenir au moins 8 caractères.";
      return;
    }

    this.isSubmitting = true;
    this.userService.changePassword(this.passwordData).subscribe(
      (res: any) => {
        this.successMsg = "Mot de passe modifié avec succès.";
        this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.isSubmitting = false;
      },
      (err: any) => {
        this.errorMsg = err?.error?.message || "Échec du changement de mot de passe.";
        this.isSubmitting = false;
      }
    );
  }
}
