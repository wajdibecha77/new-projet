import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { AuthService } from "src/app/services/auth.service";

@Component({
    selector: "app-forgot-password-reset",
    templateUrl: "./forgot-password-reset.component.html",
    styleUrls: ["./forgot-password-reset.component.scss"],
})
export class ForgotPasswordResetComponent implements OnInit {
    public newPassword: string = "";
    public confirmPassword: string = "";
    public email: string = "";
    public resetCode: string = "";
    public isSubmitting: boolean = false;
    public statusMessage: string = "";
    public statusType: "success" | "error" | "" = "";

    constructor(
        private router: Router,
        private notifier: NotifierService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.email = sessionStorage.getItem("reset_email") || "";
        this.resetCode = sessionStorage.getItem("reset_code") || "";

        if (!this.email || !this.resetCode) {
            this.router.navigateByUrl("/auth/forgot-password");
        }
    }

    submitResetPassword() {
        if (this.isSubmitting) {
            return;
        }

        if (!this.newPassword || !this.confirmPassword) {
            this.statusType = "";
            this.statusMessage = "";
            this.notifier.show({
                type: "warning",
                message: "Veuillez remplir tous les champs.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        if (this.newPassword.length < 8) {
            this.statusType = "";
            this.statusMessage = "";
            this.notifier.show({
                type: "warning",
                message: "Le mot de passe doit contenir au moins 8 caracteres.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        if (this.newPassword !== this.confirmPassword) {
            this.statusType = "error";
            this.statusMessage = "❌ Les mots de passe ne correspondent pas.";
            this.notifier.show({
                type: "warning",
                message: "Les mots de passe ne correspondent pas.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        this.isSubmitting = true;
        this.statusType = "";
        this.statusMessage = "";
        this.authService
            .resetPassword(this.email, this.resetCode, this.newPassword)
            .subscribe(
                (res: any) => {
                    this.statusType = "success";
                    this.statusMessage = "✔ Mot de passe modifie avec succes.";
                    this.notifier.show({
                        type: "success",
                        message: "Mot de passe modifie avec succes.",
                        id: "THAT_NOTIFICATION_ID",
                    });
                    sessionStorage.removeItem("reset_email");
                    sessionStorage.removeItem("reset_code");
                    setTimeout(() => {
                        this.router.navigateByUrl("/auth/signin");
                    }, 1200);
                    this.isSubmitting = false;
                },
                (err) => {
                    this.statusType = "error";
                    this.statusMessage =
                        "❌ " +
                        (err?.error?.message ||
                            "Impossible de modifier le mot de passe.");
                    this.notifier.show({
                        type: "error",
                        message:
                            err?.error?.message ||
                            "Impossible de modifier le mot de passe.",
                        id: "THAT_NOTIFICATION_ID",
                    });
                    this.isSubmitting = false;
                }
            );
    }
}
