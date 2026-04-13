import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { NotifierService } from "angular-notifier";
import { Router } from "@angular/router";
import { Intervention } from "src/app/models/intervention";
import { InterventionService } from "src/app/services/intervention.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-create-intervention",
    templateUrl: "./create-intervention.component.html",
    styleUrls: ["./create-intervention.component.scss"],
})
export class CreateInterventionComponent implements OnInit {
    @Input() stayOnPage = false;
    @Output() interventionCreated = new EventEmitter<any>();
    @Output() cancelRequested = new EventEmitter<void>();

    public intervention: Intervention;
    public successMsg: String = "";
    public errorMsg: String = "";
    public role = String(localStorage.getItem("role") || "").toUpperCase();
    private readonly technicianRoles = [
        "INFORMATICIEN",
        "ELECTRICIEN",
        "MECANICIEN",
        "PLOMBERIE",
        "TECHNICIEN",
    ];
    constructor(
        private interService: InterventionService,
        private userService: UserService,
        private notifier: NotifierService,
        private router: Router
    ) {
        this.intervention = new Intervention();
    }

    ngOnInit(): void {
        this.userService.getConnectedUser().subscribe((res: any) => {
            console.log(res);
            this.intervention.createdBy = res.data._id;
        });
    }

    createIntervention() {
        console.log(this.intervention);
        this.interService.createIntervention(this.intervention).subscribe(
            (res: any) => {
                this.successMsg = "Intervention added successfully!";
                this.interventionCreated.emit(res?.data || null);

                if (this.stayOnPage) {
                    const createdBy = this.intervention.createdBy;
                    this.intervention = new Intervention();
                    this.intervention.createdBy = createdBy;
                    return;
                }

                setTimeout(() => {
                    if (this.technicianRoles.includes(this.role)) {
                        this.router.navigate(["/dashboard-client"]);
                        return;
                    }

                    this.router.navigate(["/interventions"]);
                }, 2000);
            },
            (err) => {
                console.log("err", err);
                this.notifier.show({
                    type: "error",

                    message: "Tous les champs sont Obligatoire SVP!",
                    id: "THAT_NOTIFICATION_ID", // Again, this is optional
                });
            }
        );
    }

    cancelCreation() {
        this.cancelRequested.emit();
    }
}
