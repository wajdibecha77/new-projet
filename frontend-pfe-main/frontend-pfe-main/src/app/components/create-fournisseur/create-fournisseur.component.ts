import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { Fournisseur } from "src/app/models/fournisseur";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-create-fournisseur",
    templateUrl: "./create-fournisseur.component.html",
    styleUrls: ["./create-fournisseur.component.scss"],
})
export class CreateFournisseurComponent implements OnInit {
    public fournisseur: Fournisseur;
    public initialFournisseur: any = {};
    public successMsg: String = "";
    public errorMsg: String = "";
    public isEditMode: boolean = false;
    public fournisseurId: string = "";

    constructor(
        private userService: UserService,
        private notifier: NotifierService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.fournisseur = new Fournisseur();
    }

    ngOnInit(): void {
        this.fournisseurId = this.route.snapshot.paramMap.get("id") || "";
        this.isEditMode = !!this.fournisseurId;

        if (this.isEditMode) {
            this.userService
                .getFournisseurById(this.fournisseurId)
                .subscribe((res: any) => {
                    this.fournisseur = res.data;
                    this.initialFournisseur = {
                        name: res.data?.name || "",
                        email: res.data?.email || "",
                        tel: res.data?.tel ? String(res.data.tel) : "",
                    };
                });
        }
    }

    saveFournisseur(event?) {
        if (event) {
            event.preventDefault();
        }

        if (this.isEditMode) {
            const updatePayload: any = {};
            const currentName = this.fournisseur.name
                ? this.fournisseur.name.toString().trim()
                : "";
            const currentEmail = this.fournisseur.email
                ? this.fournisseur.email.toString().trim()
                : "";
            const currentTel = this.fournisseur.tel
                ? this.fournisseur.tel.toString().trim()
                : "";

            if (currentName !== this.initialFournisseur.name) {
                updatePayload.name = currentName;
            }
            if (currentEmail !== this.initialFournisseur.email) {
                updatePayload.email = currentEmail;
            }
            if (currentTel !== this.initialFournisseur.tel) {
                updatePayload.tel = currentTel;
            }

            if (Object.keys(updatePayload).length === 0) {
                this.notifier.show({
                    type: "warning",
                    message: "Aucune modification detectee.",
                    id: "THAT_NOTIFICATION_ID",
                });
                return;
            }

            this.userService
                .updateFournisseur(this.fournisseurId, updatePayload)
                .subscribe(
                    () => {
                        this.successMsg = "Fournisseur updated successfully!";
                        setTimeout(() => {
                            this.router.navigateByUrl("/fournisseurs");
                        }, 1000);
                    },
                    (err) => {
                        const backendMessage =
                            err?.error?.message ||
                            err?.error?.msg ||
                            err?.error?.error ||
                            err?.message;

                        this.notifier.show({
                            type: "error",
                            message:
                                backendMessage ||
                                "La mise a jour a echoue. Verifiez les champs.",
                            id: "THAT_NOTIFICATION_ID",
                        });
                    }
                );
            return;
        }

        this.userService.createFournisseur(this.fournisseur).subscribe(
            () => {
                this.successMsg = "Fournisseur added successfully!";
                setTimeout(() => {
                    this.router.navigateByUrl("/fournisseurs");
                }, 1000);
            },
            () => {
                this.notifier.show({
                    type: "error",
                    message: "Tous les champs sont Obligatoire SVP!",
                    id: "THAT_NOTIFICATION_ID",
                });
            }
        );
    }
}
