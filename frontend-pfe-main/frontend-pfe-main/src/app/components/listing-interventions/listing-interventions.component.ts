import { Component, OnInit } from "@angular/core";
import { NotifierService } from "angular-notifier";
import { User } from "src/app/models/user";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-listing-interventions",
    templateUrl: "./listing-interventions.component.html",
    styleUrls: ["./listing-interventions.component.scss"],
})
export class ListingInterventionsComponent implements OnInit {
    public interventions: any;
    public users: User[];
    public intervention;
    public selectedUsersByIntervention: { [key: string]: any } = {};
    public total = 0;
    public filter;
    constructor(
        private interService: InterventionService,
        private userService: UserService,
        private notifier: NotifierService
    ) {
        this.filter = {
            name: "",
            createdBy: "",
            lieu: "",
            etat: "",
        };
    }

    getInterventions() {
        this.interService.getAllInterventions().subscribe((res: any) => {
            console.log(res);
            this.total = res.length;
            this.interventions = res.reverse();
        });
    }

    ngOnInit(): void {
        this.userService.getAllUsers().subscribe((res: any) => {
            this.users = res.data.reverse();
        });
        this.getInterventions();
    }
    setIntervention(inter) {
        console.log("here", inter);
        this.intervention = inter;
    }

    setAffectedUser(interventionId, user) {
        this.selectedUsersByIntervention[interventionId] = user;
    }

    closeModal(modalId: string) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.classList.remove("show");
            modalEl.setAttribute("aria-hidden", "true");
            (modalEl as HTMLElement).style.display = "none";
        }

        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("padding-right");
        const backdrops = document.querySelectorAll(".modal-backdrop");
        backdrops.forEach((backdrop) => backdrop.remove());
    }

    affectedToUser(intervention, modalId: string) {
        const selectedUser = this.selectedUsersByIntervention[intervention?._id];

        if (!selectedUser?._id) {
            this.notifier.show({
                type: "warning",
                message: "Veuillez selectionner un utilisateur.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        this.interService
            .updateInterventionStatus(intervention._id, {
                affectedBy: selectedUser._id,
            })
            .subscribe((res: any) => {
                const selected = this.selectedUsersByIntervention[intervention._id];
                const idx = this.interventions?.findIndex(
                    (it) => it._id === intervention._id
                );

                if (idx >= 0) {
                    this.interventions[idx] = {
                        ...this.interventions[idx],
                        affectedBy: selected,
                        etat: "EN_COURS",
                        dateDebut: new Date(),
                    };
                }

                this.notifier.show({
                    type: "success",
                    message: "Intervention affectee avec succes.",
                    id: "THAT_NOTIFICATION_ID",
                });

                this.closeModal(modalId);
                delete this.selectedUsersByIntervention[intervention._id];
            },
            (err) => {
                const backendMessage =
                    err?.error?.message || err?.error?.msg || "";
                this.notifier.show({
                    type: "error",
                    message: backendMessage
                        ? backendMessage
                        : "Echec lors de l'affectation de l'utilisateur.",
                    id: "THAT_NOTIFICATION_ID",
                });
            });
    }

    supprimerIntervention(id) {
        this.interService.deleteIntervention(id).subscribe((res) => {
            this.getInterventions();
        });
    }
}
