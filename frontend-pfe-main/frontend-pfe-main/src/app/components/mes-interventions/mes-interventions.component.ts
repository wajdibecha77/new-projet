import { Component, OnInit } from "@angular/core";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-mes-interventions",
    templateUrl: "./mes-interventions.component.html",
    styleUrls: ["./mes-interventions.component.scss"],
})
export class MesInterventionsComponent implements OnInit {
    public interventions: any;
    public me: any;
    public token?: any = localStorage.getItem("token");
    public role = String(localStorage.getItem("role") || "").toUpperCase();
    public intervention;
    public affectedUser: any;
    public total = 0;
    public filter;
    private readonly technicianRoles = [
        "INFORMATICIEN",
        "ELECTRICIEN", 
        "MECANICIEN",
        "PLOMBERIE",
        "TECHNICIEN",
    ];
    constructor(
        private interService: InterventionService,
        private userService: UserService
    ) {
        this.filter = {
            name: "",
            createdBy: "",
            lieu: "",
            etat: "",
        };
    }

    getInterventions(type = null) {
        this.interventions = [];
        if (this.token) {
            this.userService.getConnectedUser().subscribe((res: any) => {
                this.me = res.data;

                this.interService
                    .getAllInterventions()
                    .subscribe((res: any) => {
                        this.total = res.length;
                        if (!type) {
                            this.interventions = res;
                            return;
                        }

                        if (this.isTechnicianRole(this.role)) {
                            this.interventions = res.filter(
                                (inter) => inter?.affectedBy?._id == this.me?._id
                            );
                        }
                    });
            });
        }
    }

    private isTechnicianRole(role: string): boolean {
        return this.technicianRoles.includes(role.toUpperCase());
    }

    ngOnInit(): void {
        this.getInterventions();
    }

    getMesInterventions() {
        this.getInterventions("me");
    }

    setIntervention(inter) {
        console.log("here", inter);
        this.intervention = inter;
    }

    affectedToMe(intervention) {
        this.interService
            .updateInterventionStatus(intervention._id, {
                affectedBy: this.me._id,
            })
            .subscribe((res: any) => {
                window.location.reload();
            });
    }
}
