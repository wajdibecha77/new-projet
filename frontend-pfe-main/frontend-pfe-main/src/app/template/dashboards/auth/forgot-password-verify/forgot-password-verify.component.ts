import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { AuthService } from "src/app/services/auth.service";

@Component({
    selector: "app-forgot-password-verify",
    templateUrl: "./forgot-password-verify.component.html",
    styleUrls: ["./forgot-password-verify.component.scss"],
})
export class ForgotPasswordVerifyComponent implements OnInit {
    public email: string = "";
    public otp: string = "";
    public isSubmitting: boolean = false;
    public isResending: boolean = false;
    public statusMessage: string = "";
    public statusType: "success" | "error" | "" = "";

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notifier: NotifierService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.email = (this.route.snapshot.queryParamMap.get("email") || "")
            .trim()
            .toLowerCase();

        if (!this.email) {
            this.router.navigateByUrl("/auth/forgot-password");
        }
    }

    verifyOtp() {
        if (this.isSubmitting) {
            return;
        }

        if (!this.email || !this.otp) {
            this.statusType = "";
            this.statusMessage = "";
            this.notifier.show({
                type: "warning",
                message: "Veuillez saisir le code OTP recu par email.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        const normalizedOtp = String(this.otp || "").trim();
        if (!/^\d{6}$/.test(normalizedOtp)) {
            this.statusType = "error";
            this.statusMessage = "❌ Code incorrect.";
            this.notifier.show({
                type: "warning",
                message: "Le code doit contenir 6 chiffres.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        this.isSubmitting = true;
        this.statusType = "";
        this.statusMessage = "";
        this.authService.verifyResetCode(this.email, normalizedOtp).subscribe(
            () => {
                sessionStorage.setItem("reset_email", this.email);
                sessionStorage.setItem("reset_code", normalizedOtp);
                this.statusType = "success";
                this.statusMessage = "✔ Code envoye et valide.";
                this.notifier.show({
                    type: "success",
                    message: "Code valide. Continuez la reinitialisation.",
                    id: "THAT_NOTIFICATION_ID",
                });
                this.router.navigateByUrl("/auth/reset-password");
                this.isSubmitting = false;
            },
            (err) => {
                this.statusType = "error";
                this.statusMessage = "❌ Code incorrect.";
                this.notifier.show({
                    type: "error",
                    message:
                        err?.error?.message ||
                        "Code invalide, deja utilise, ou expire.",
                    id: "THAT_NOTIFICATION_ID",
                });
                this.isSubmitting = false;
            }
        );
    }

    resendOtp() {
        if (this.isResending || !this.email) {
            return;
        }

        this.isResending = true;
        this.statusType = "";
        this.statusMessage = "";
        this.authService.forgotPassword(this.email).subscribe(
            (res: any) => {
                this.statusType = "success";
                this.statusMessage = "✔ Code envoye.";
                this.notifier.show({
                    type: "success",
                    message: "Nouveau code envoye.",
                    id: "THAT_NOTIFICATION_ID",
                });
                this.isResending = false;
            },
            (err) => {
                this.notifier.show({
                    type: "error",
                    message:
                        err?.error?.message ||
                        "Echec lors du renvoi du code OTP.",
                    id: "THAT_NOTIFICATION_ID",
                });
                this.isResending = false;
            }
        );
    }
}
