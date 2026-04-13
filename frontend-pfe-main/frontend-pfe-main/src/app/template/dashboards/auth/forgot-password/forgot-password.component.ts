import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { AuthService } from 'src/app/services/auth.service';

@Component({
    selector: "app-forgot-password",
    templateUrl: "./forgot-password.component.html",
    styleUrls: ["./forgot-password.component.scss"],
})
export class ForgotPasswordComponent implements OnInit {
    public email: string = "";
    public isSubmitting: boolean = false;
    public securityAlert: boolean = false;

    constructor(
        private authService: AuthService,
        private notifier: NotifierService,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    ngOnInit() {
        this.route.queryParamMap.subscribe((params) => {
            const emailFromQuery = (params.get("email") || "").trim().toLowerCase();
            const alertFlag = params.get("securityAlert");

            if (emailFromQuery) {
                this.email = emailFromQuery;
            }

            this.securityAlert = alertFlag === "1" || alertFlag === "true";
        });
    }

    handleResetPassword() {
        if (this.isSubmitting) {
            return;
        }

        const normalizedEmail = (this.email || "").trim().toLowerCase();
        if (!normalizedEmail) {
            this.notifier.show({
                type: "warning",
                message: "Veuillez saisir votre adresse email.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        this.isSubmitting = true;
        this.authService.forgotPassword(normalizedEmail).subscribe(
            (res: any) => {
                this.notifier.show({
                    type: "success",
                    message: "Code envoye par email.",
                    id: "THAT_NOTIFICATION_ID",
                });
                this.router.navigate(["/auth/forgot-password/verify"], {
                    queryParams: { email: normalizedEmail },
                });
                this.isSubmitting = false;
            },
            (err) => {
                this.notifier.show({
                    type: "error",
                    message:
                        err?.error?.message ||
                        "Impossible d'envoyer l'email de reinitialisation.",
                    id: "THAT_NOTIFICATION_ID",
                });
                this.isSubmitting = false;
            }
        );
    }
}

