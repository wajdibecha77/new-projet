import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Intervention } from "src/app/models/intervention";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-intervention-details",
    templateUrl: "./intervention-details.component.html",
    styleUrls: ["./intervention-details.component.scss"],
})
export class InterventionDetailsComponent implements OnInit {
    public intervention: any;
    public users: any;
    public me: any;
    public id: string;
    public affectedUser: any;
    public workDetails = "";
    public comment = "";
    public problem = "";
    public nextStatus = "";
    public refusCommentaire = "";
    public refusType = "AUTRE";
    public refuseError = "";
    constructor(
        private interventionService: InterventionService,
        private userService: UserService,
        private route: ActivatedRoute,
        private appRouter: Router
    ) {}

    ngOnInit(): void {
        this.userService.getConnectedUser().subscribe((res: any) => {
            this.me = res.data;
            if (this.me?.role === "ADMIN") {
                this.userService.getAllUsers().subscribe((usersRes: any) => {
                    this.users = usersRes.data;
                });
            }
        });
        this.route.params.subscribe((params) => {
            this.id = params["id"];
            this.loadIntervention();
        });
    }

    private redirectToDashboard() {
        if (this.me?.role === "ADMIN") {
            this.appRouter.navigate(["/dashboard"], {
                queryParams: { refresh: Date.now() },
            });
            return;
        }
        this.appRouter.navigate(["/dashboard-visiteur"], {
            queryParams: { refresh: Date.now() },
        });
    }

    loadIntervention() {
        this.interventionService.getInterventionById(this.id).subscribe((res) => {
            this.intervention = res;
            this.workDetails = this.intervention?.workDetails || "";
        });
    }

    canManageAssignedIntervention() {
        if (!this.intervention || !this.me) return false;
        if (this.me.role === "ADMIN") return true;
        return this.intervention?.affectedBy?._id == this.me?._id;
    }

    setAffectedUser(user) {
        this.affectedUser = user;
    }

    affectedToUser(intervention) {
        if (!this.affectedUser?._id) return;
        this.interventionService
            .updateInterventionStatus(intervention._id, {
                affectedBy: this.affectedUser._id,
            })
            .subscribe((res: any) => {
                this.loadIntervention();
            });
    }

    affectedToMe(intervention) {
        this.interventionService
            .updateInterventionStatus(intervention._id, {
                affectedBy: this.me._id,
            })
            .subscribe((res: any) => {
                window.location.reload();
            });
    }

    interventionDone(intervention) {
        this.interventionService
            .updateInterventionStatus(intervention._id, {
                etat: "TERMINEE",
            })
            .subscribe((res: any) => {
                this.loadIntervention();
            });
    }

    interventionExit(intervention) {
        const commentaire = String(this.refusCommentaire || "").trim();
        if (!commentaire) {
            this.refuseError = "Le commentaire de refus est obligatoire.";
            return;
        }

        this.refuseError = "";
        this.interventionService
            .refuseIntervention(intervention._id, {
                commentaire,
                refusType: this.refusType || "AUTRE",
            })
            .subscribe(
                () => {
                    this.refusCommentaire = "";
                    this.refusType = "AUTRE";
                    this.loadIntervention();
                },
                (err) => {
                    this.refuseError =
                        err?.error?.message || "Erreur lors du refus de l'intervention.";
                }
            );
    }

    supprimerIntervention(id) {
        this.interventionService.deleteIntervention(id).subscribe((res) => {
            window.location.href = "/interventions";
        });
    }

    updateOrderIntervention(id) {
        let params = {
            interventionId: id,
        };
        this.interventionService
            .updateInterventionOrder(id, params)
            .subscribe((res) => {
                this.loadIntervention();
            });
    }

    saveWorkUpdate() {
        if (!this.intervention?._id || !this.canManageAssignedIntervention()) return;

        const payload: any = {};
        if (String(this.workDetails || "").trim()) payload.workDetails = this.workDetails;
        if (String(this.comment || "").trim()) payload.comment = this.comment;
        if (String(this.problem || "").trim()) payload.problem = this.problem;
        if (String(this.nextStatus || "").trim()) payload.etat = this.nextStatus;

        if (Object.keys(payload).length === 0) return;

        this.interventionService
            .updateInterventionStatus(this.intervention._id, payload)
            .subscribe(() => {
                this.comment = "";
                this.problem = "";
                this.nextStatus = "";
                this.loadIntervention();
            });
    }
}
