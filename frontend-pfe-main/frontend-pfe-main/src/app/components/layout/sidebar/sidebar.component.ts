import { Component, OnDestroy, OnInit, AfterViewInit } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { Subject, interval } from "rxjs";
import { filter, startWith, switchMap, takeUntil } from "rxjs/operators";
import { NotificationService } from "src/app/services/notification.service";
import { SidebarService } from "src/app/services/sidebar.service";

declare var feather: any;

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {

  public role = localStorage.getItem("role") || "";
  public notificationsCount = 0;
  private destroy$ = new Subject<void>();

  public sidebarItems: any[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    public sidebar: SidebarService
  ) {}

  ngOnInit(): void {

    /* 🔥 SIDEBAR حسب ROLE */
    if (this.role === "ADMIN") {
      this.sidebarItems = [
        { path: "/dashboard", title: "Dashboard", icon: "grid" },
        { path: "/users", title: "Users", icon: "users" },
        { path: "/interventions", title: "Interventions", icon: "tool" },

        // 🔥 NEW FEATURE (Réclamations ADMIN)
        { path: "/reclamations", title: "Réclamations", icon: "alert-circle" },

        { path: "/services", title: "Services", icon: "inbox" },
        { path: "/fournisseurs", title: "Fournisseurs", icon: "user" },
        { path: "/commandes", title: "Commandes", icon: "list" },
        { path: "/create-user", title: "Create User", icon: "user" },
        { path: "/profile", title: "User Profile", icon: "settings" },
        { path: "/notifications", title: "Notifications", icon: "bell" },
        { path: "/qr-code", title: "QR Code (Demo)", icon: "maximize" },
      ];
    } else if (this.isTechnicianRole(this.role)) {
      // 👷 TECHNICIEN
      this.sidebarItems = [
        { path: "/dashboard-client", title: "Dashboard", icon: "grid" },
        { path: "/mes-interventions", title: "Mes interventions", icon: "tool" },
        { path: "/notifications", title: "Messages", icon: "mail" },
        { path: "/profile", title: "User Profile", icon: "settings" },
        { path: "/qr-code", title: "QR Code (Demo)", icon: "maximize" },
      ];
    } else {
      // 👤 CLIENT/VISITEUR
      this.sidebarItems = [
        { path: "/dashboard-visiteur", title: "Dashboard", icon: "grid" },
        { path: "/reclamation", title: "Réclamation", icon: "alert-circle" },
        { path: "/notifications", title: "Messages", icon: "mail" },
        { path: "/profile", title: "User Profile", icon: "settings" },
        { path: "/qr-code", title: "QR Code (Demo)", icon: "maximize" },
      ];
    }

    /* 🔔 NOTIFICATIONS */
    this.notificationService.notificationsCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => this.notificationsCount = count);

    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.notificationService.refreshNotificationsCount()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: count => this.notificationsCount = count,
        error: () => this.notificationsCount = 0,
      });

    /* 🔄 ROUTE EVENTS */
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {

        if (event.urlAfterRedirects === "/notifications") {
          this.notificationsCount = 0;
        }

        this.sidebar.close();
      });
  }

  /* 🔥 ICONS FIX */
  ngAfterViewInit() {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isTechnicianRole(role: string): boolean {
    const technicianRoles = ['INFORMATICIEN', 'ELECTRICIEN', 'MECANICIEN', 'PLOMBERIE', 'TECHNICIEN'];
    return technicianRoles.includes(role?.toUpperCase());
  }

  closeSidebar() {
    this.sidebar.close();
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl("/auth/signin");
  }
}
