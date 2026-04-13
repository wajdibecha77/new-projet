import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { User } from "src/app/models/user";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-listing-users",
    templateUrl: "./listing-users.component.html",
    styleUrls: ["./listing-users.component.scss"],
})
export class ListingUsersComponent implements OnInit {
    public users: User[];
    public filter;
    constructor(private userService: UserService, private router: Router) {
        this.filter = {
            name: "",
            role: "",
        };
    }
    getAllUsers() {
        this.userService.getAllUsers().subscribe((res: any) => {
            this.users = res.data;
        });
    }
    ngOnInit(): void {
        this.getAllUsers();
    }

    deleteUser(id) {
        this.userService.deleteUser(id).subscribe((res) => {
            this.userService.getAllUsers().subscribe((res: any) => {
                this.users = res.data;
            });
        });
    }

    editUser(user: any) {
        this.router.navigate(["/create-user", user?._id], {
            state: { user },
        });
    }
}
