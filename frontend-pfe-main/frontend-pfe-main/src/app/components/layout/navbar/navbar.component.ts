import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { User } from "src/app/models/user";
import { UserService } from "src/app/services/user.service";
import { SidebarService } from "src/app/services/sidebar.service";
import { NotificationService } from "src/app/services/notification.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

@Component({
    selector: "app-navbar",
    templateUrl: "./navbar.component.html",
    styleUrls: ["./navbar.component.scss"],
})
export class NavbarComponent implements OnInit, OnDestroy {

    public token: string | null = localStorage.getItem("token");
    public isConnected: boolean = false;

    public account: User | null = null;
    public notificationsCount: number = 0;
    public avatarMenuOpen = false;
    public profileImageUrl: string | null = null;
    private destroy$ = new Subject<void>();

    constructor(
        private userService: UserService,
        public sidebar: SidebarService,
        private notificationService: NotificationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        if (!this.token) {
            this.isConnected = false;
            return;
        }

        this.isConnected = true;

        this.profileImageUrl = this.userService.buildProfileImageUrl(
            this.userService.getProfileImageSnapshot()
        );
        this.userService.profileImage$
            .pipe(takeUntil(this.destroy$))
            .subscribe((image) => {
                this.profileImageUrl = this.userService.buildProfileImageUrl(image);
            });

        this.userService.getConnectedUser().subscribe({
            next: (res: any) => {
                this.account = res?.data || null;
                this.userService.setProfileImage((res?.data as any)?.image || null);
            },
            error: () => {
                this.account = null;
            }
        });

        this.notificationService.notificationsCount$
            .pipe(takeUntil(this.destroy$))
            .subscribe(count => {
                this.notificationsCount = count;
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    @HostListener("document:click")
    onDocumentClick(): void {
        this.avatarMenuOpen = false;
    }

    isAdminDashboardHeader(): boolean {
        const role = String(this.account?.role || "").toUpperCase();
        const isAuthPage = this.router.url.startsWith("/auth");
        return role === "ADMIN" && !isAuthPage;
    }

    toggleAvatarMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.avatarMenuOpen = !this.avatarMenuOpen;
    }

    keepMenuOpen(event: MouseEvent): void {
        event.stopPropagation();
    }

    logout(): void {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        this.userService.setProfileImage(null);
        this.isConnected = false;
        this.router.navigateByUrl("/login");
    }
}
