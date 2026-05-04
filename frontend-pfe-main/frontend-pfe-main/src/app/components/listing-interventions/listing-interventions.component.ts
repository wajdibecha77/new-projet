import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { NotifierService } from "angular-notifier";
import { Subject } from "rxjs";
import { finalize, takeUntil } from "rxjs/operators";
import { User } from "src/app/models/user";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-listing-interventions",
    templateUrl: "./listing-interventions.component.html",
    styleUrls: ["./listing-interventions.component.scss"],
})
export class ListingInterventionsComponent implements OnInit, OnDestroy {
    public interventions: any;
    public users: User[];
    public intervention;
    public selectedUsersByIntervention: { [key: string]: any } = {};
    public loadingByIntervention: { [key: string]: boolean } = {};
    public total = 0;
    public filter;
    private destroy$ = new Subject<void>();
    constructor(
        private interService: InterventionService,
        private userService: UserService,
        private notifier: NotifierService,
        private cdr: ChangeDetectorRef
    ) {
        this.filter = {
            name: "",
            createdBy: "",
            lieu: "",
            etat: "",
        };
    }

    getInterventions() {
        this.interService
            .getAllInterventions()
            .pipe(takeUntil(this.destroy$))
            .subscribe((res: any) => {
                console.log(res);
                this.total = res.length;
                this.interventions = res.reverse();
            });
    }

    ngOnInit(): void {
        this.userService
            .getAllUsers()
            .pipe(takeUntil(this.destroy$))
            .subscribe((res: any) => {
                this.users = res.data.reverse();
            });
        this.getInterventions();
    }
    setIntervention(inter) {
        console.log("here", inter);
        this.intervention = inter;
    }

    setAffectedUser(interventionId, user) {
        if (this.loadingByIntervention[interventionId]) return;
        this.selectedUsersByIntervention[interventionId] = user;
    }

    isAffectationLoading(interventionId: string): boolean {
        return !!this.loadingByIntervention[interventionId];
    }

    resetAffectationState(interventionId: string) {
        delete this.selectedUsersByIntervention[interventionId];
        this.loadingByIntervention[interventionId] = false;
    }

    onCancelAffectation(interventionId: string, modalId: string) {
        this.resetAffectationState(interventionId);
        this.closeModal(modalId);
        this.cdr.detectChanges();
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
        if (!intervention?._id) return;
        if (this.loadingByIntervention[intervention._id]) return;

        const selectedUser = this.selectedUsersByIntervention[intervention?._id];

        if (!selectedUser?._id) {
            this.notifier.show({
                type: "warning",
                message: "Veuillez selectionner un utilisateur.",
                id: "THAT_NOTIFICATION_ID",
            });
            return;
        }

        this.loadingByIntervention[intervention._id] = true;
        this.interService
            .updateInterventionStatus(intervention._id, {
                affectedBy: selectedUser._id,
            })
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.loadingByIntervention[intervention._id] = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe(
                (res: any) => {
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

                    this.onCancelAffectation(intervention._id, modalId);
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
                }
            );
    }

    supprimerIntervention(id) {
        this.interService
            .deleteIntervention(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
                this.getInterventions();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
