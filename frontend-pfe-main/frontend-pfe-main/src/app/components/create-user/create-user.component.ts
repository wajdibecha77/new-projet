import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { User } from "src/app/models/user";
import { ServiceUserService } from "src/app/services/service-user.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-create-user",
    templateUrl: "./create-user.component.html",
    styleUrls: ["./create-user.component.scss"],
})
export class CreateUserComponent implements OnInit {
    public user: User;
    public successMsg: String = "";
    public isEditMode: boolean = false;
    public userId: string | null = null;
    public services: any;
    constructor(
        private userService: UserService,
        private serviceProvider: ServiceUserService,
        private route: ActivatedRoute,
        private router: Router,
        private notifier: NotifierService
    ) {
        this.user = new User();
    }

    ngOnInit(): void {
        this.serviceProvider.getAllServices().subscribe((res: any) => {
            this.services = res.data;
        });

        this.userId = this.route.snapshot.paramMap.get("id");
        this.isEditMode = !!this.userId;

        if (this.isEditMode && this.userId) {
            const navigationUser = history?.state?.user;
            if (navigationUser && (navigationUser._id === this.userId || navigationUser.id === this.userId)) {
                this.user = {
                    ...navigationUser,
                    password: "",
                };
                return;
            }

            this.userService.getUserById(this.userId).subscribe(
                (res: any) => {
                    this.user = {
                        ...res.data,
                        password: "",
                    };
                },
                (err) => {
                    const backendMessage =
                        err?.error?.message || err?.error?.msg || "";
                    this.notifier.show({
                        type: "error",
                        message: backendMessage
                            ? `Impossible de charger l'utilisateur a modifier: ${backendMessage}`
                            : "Impossible de charger l'utilisateur a modifier.",
                        id: "THAT_NOTIFICATION_ID",
                    });
                    this.router.navigateByUrl("/users");
                }
            );
        }
    }

    submitUser() {
        const request$ =
            this.isEditMode && this.userId
                ? this.userService.updateUser(this.userId, this.user)
                : this.userService.createUser(this.user);

        request$.subscribe(
            (res: any) => {
                this.successMsg = this.isEditMode
                    ? "User updated successfully!"
                    : "User added successfully!";
                setTimeout(() => {
                    this.router.navigateByUrl("/users");
                }, 2000);
            },
            (err) => {
                console.log("err", err);
                const backendMessage =
                    err?.error?.message || err?.error?.msg || "";
                this.notifier.show({
                    type: "error",

                    message: backendMessage
                        ? backendMessage
                        : this.isEditMode
                        ? "Echec de modification de l'utilisateur."
                        : "Tous les champs sont Obligatoire SVP!",
                    id: "THAT_NOTIFICATION_ID", // Again, this is optional
                });
            }
        );
    }
}
