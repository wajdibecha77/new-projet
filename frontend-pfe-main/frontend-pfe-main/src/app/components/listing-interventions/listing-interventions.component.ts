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
    public users: User[] = [];
    public intervention;
    public selectedIntervention: any = null;
    public selectedUsersByIntervention: { [key: string]: any } = {};
    public loadingByIntervention: { [key: string]: boolean } = {};
    public isLoadingUsers = false;
    public total = 0;
    public filter;
    private previousBodyOverflow = "";
    private usersLoaded = false;
    private usersRequestInFlight = false;
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
        this.loadUsers();
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

    trackByUserId(_: number, user: any): string {
        return String(user?._id || "");
    }

    loadUsers(force = false) {
        if (this.usersRequestInFlight) return;
        if (this.usersLoaded && !force) return;

        this.usersRequestInFlight = true;
        this.isLoadingUsers = true;

        this.userService
            .getAllUsers()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.usersRequestInFlight = false;
                    this.isLoadingUsers = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe(
                (res: any) => {
                    this.users = (res?.data || []).reverse();
                    this.usersLoaded = true;
                },
                () => {
                    this.usersLoaded = false;
                }
            );
    }

    openAffectationModal(intervention: any, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!intervention?._id) return;

        this.selectedIntervention = intervention;
        this.loadUsers();

        // Wait one tick to avoid modal/render race conditions.
        setTimeout(() => {
            this.cdr.detectChanges();
            this.openModal(`ModalRes${intervention._id}`);
        }, 30);
    }

    getUsersForIntervention(intervention: any): User[] {
        if (!intervention?.name || !Array.isArray(this.users)) return [];
        const prefix = String(intervention.name).charAt(0);
        return this.users.filter(
            (user: any) => String(user?.role || "").charAt(0) === prefix
        );
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
        if (this.selectedIntervention?._id === interventionId) {
            this.selectedIntervention = null;
        }
        this.closeModal(modalId);
        this.cdr.detectChanges();
    }

    openModal(modalId: string) {
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;

        modalEl.classList.add("custom-affectation-modal");
        modalEl.classList.add("show");
        modalEl.setAttribute("aria-modal", "true");
        modalEl.setAttribute("role", "dialog");
        modalEl.removeAttribute("aria-hidden");
        (modalEl as HTMLElement).style.display = "block";

        this.previousBodyOverflow = document.body.style.overflow || "";
        document.body.style.overflow = "hidden";
        document.body.classList.add("modal-open");
        if (!document.querySelector(".custom-affectation-backdrop")) {
            const backdrop = document.createElement("div");
            backdrop.className = "modal-backdrop fade show custom-affectation-backdrop";
            document.body.appendChild(backdrop);
        }
    }

    closeModal(modalId: string) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.classList.remove("custom-affectation-modal");
            modalEl.classList.remove("show");
            modalEl.setAttribute("aria-hidden", "true");
            (modalEl as HTMLElement).style.display = "none";
        }

        document.body.style.overflow = this.previousBodyOverflow;
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("padding-right");
        const backdrops = document.querySelectorAll(".custom-affectation-backdrop");
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
                            etat: "ASSIGNEE",
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
        document.body.style.overflow = this.previousBodyOverflow;
        const backdrops = document.querySelectorAll(".custom-affectation-backdrop");
        backdrops.forEach((backdrop) => backdrop.remove());
        this.destroy$.next();
        this.destroy$.complete();
    }
}
