import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { ServiceModel } from "src/app/models/service-model";
import { ServiceUserService } from "src/app/services/service-user.service";

@Component({
    selector: "app-create-service",
    templateUrl: "./create-service.component.html",
    styleUrls: ["./create-service.component.scss"],
})
export class CreateServiceComponent implements OnInit {
    public service: ServiceModel;
    public initialService: any = {};
    public successMsg: String = "";
    public errorMsg: String = "";
    public isEditMode: boolean = false;
    public serviceId: string = "";

    constructor(
        private serviceProvider: ServiceUserService,
        private notifier: NotifierService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.service = new ServiceModel();
    }

    ngOnInit(): void {
        this.serviceId = this.route.snapshot.paramMap.get("id") || "";
        this.isEditMode = !!this.serviceId;

        if (this.isEditMode) {
            this.serviceProvider.getServiceById(this.serviceId).subscribe(
                (res: any) => {
                    this.service = res.data;
                    this.initialService = {
                        name: res.data?.name || "",
                        email: res.data?.email || "",
                        tel: res.data?.tel ? String(res.data.tel) : "",
                    };
                },
                (err) => {
                    this.notifier.show({
                        type: "error",
                        message:
                            err?.error?.message ||
                            "Impossible de charger le service a modifier.",
                        id: "THAT_NOTIFICATION_ID",
                    });
                }
            );
        }
    }

    saveService(event?) {
        if (event) {
            event.preventDefault();
        }

        if (this.isEditMode) {
            const updatePayload: any = {};
            const currentName = this.service.name
                ? this.service.name.toString().trim()
                : "";
            const currentEmail = this.service.email
                ? this.service.email.toString().trim()
                : "";
            const currentTel = this.service.tel
                ? this.service.tel.toString().trim()
                : "";

            if (currentName !== this.initialService.name) {
                updatePayload.name = currentName;
            }
            if (currentEmail !== this.initialService.email) {
                updatePayload.email = currentEmail;
            }
            if (currentTel !== this.initialService.tel) {
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

            this.serviceProvider
                .updateService(this.serviceId, updatePayload)
                .subscribe(
                    () => {
                        this.successMsg = "Service updated successfully!";
                        setTimeout(() => {
                            this.router.navigateByUrl("/services");
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

        this.serviceProvider.addService(this.service).subscribe(
            () => {
                this.successMsg = "service added successfully!";
                setTimeout(() => {
                    this.router.navigateByUrl("/services");
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
