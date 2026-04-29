import {
  AfterViewInit,
  Component,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { NavigationEnd, Router } from "@angular/router";
import { Observable, Subject, interval } from "rxjs";
import { filter, finalize, map, startWith, switchMap, takeUntil } from "rxjs/operators";
import { environment } from "src/environments/environment";
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
  public aiEnabled = false;
  public aiToggleLoading = false;
  public sidebarItems: any[] = [];
  private readonly aiToggleApiUrl = `${environment.apiUrl}/config/ai-toggle`;
  private destroy$ = new Subject<void>();

  @HostBinding("class.open")
  get isOpen(): boolean {
    return this.sidebar.isOpen;
  }

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private router: Router,
    public sidebar: SidebarService
  ) {}

  ngOnInit(): void {
    this.buildSidebarItems();
    this.syncSidebarForViewport();
    if (this.isAdmin()) {
      this.loadAiToggleState(true);
    }

    this.notificationService.notificationsCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.notificationsCount = count;
      });

    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.notificationService.refreshNotificationsCount()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (count) => (this.notificationsCount = count),
        error: () => (this.notificationsCount = 0),
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects === "/notifications") {
          this.notificationsCount = 0;
        }

        if (this.isMobileViewport()) {
          this.sidebar.close();
        }
      });
  }

  ngAfterViewInit(): void {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeSidebar(): void {
    if (this.isMobileViewport()) {
      this.sidebar.close();
    }
  }

  @HostListener("window:resize")
  onResize(): void {
    this.syncSidebarForViewport();
  }

  logout(): void {
    localStorage.clear();
    this.sidebar.close();
    this.router.navigateByUrl("/login");
  }

  isMobileViewport(): boolean {
    return typeof window !== "undefined" && window.innerWidth < 992;
  }

  onAiToggleChange(enabled: boolean): void {
    if (this.aiToggleLoading) {
      return;
    }

    const previousValue = this.aiEnabled;
    this.aiEnabled = enabled;
    this.aiToggleLoading = true;

    this.http
      .put(this.aiToggleApiUrl, { enabled })
      .pipe(finalize(() => (this.aiToggleLoading = false)))
      .subscribe({
        next: () => {
          this.loadAiToggleState(false);
        },
        error: () => {
          this.aiEnabled = previousValue;
        },
      });
  }

  private syncSidebarForViewport(): void {
    if (this.isMobileViewport()) {
      this.sidebar.close();
      return;
    }

    this.sidebar.isOpen = true;
  }

  private buildSidebarItems(): void {
    if (this.isAdmin()) {
      this.sidebarItems = [
        { path: "/dashboard", title: "Dashboard", icon: "grid" },
        { path: "/users", title: "Users", icon: "users" },
        { path: "/interventions", title: "Interventions", icon: "tool" },
        { path: "/reclamations", title: "Reclamations", icon: "alert-circle" },
        { path: "/services", title: "Services", icon: "inbox" },
        { path: "/fournisseurs", title: "Fournisseurs", icon: "user" },
        { path: "/commandes", title: "Commandes", icon: "list" },
        { path: "/create-user", title: "Create User", icon: "user" },
        { path: "/profile", title: "User Profile", icon: "settings" },
        { path: "/notifications", title: "Notifications", icon: "bell" },
        { path: "/qr-code", title: "QR Code", icon: "maximize" },
      ];
      return;
    }

    if (this.isTechnicianRole(this.role)) {
      this.sidebarItems = [
        { path: "/dashboard-client", title: "Dashboard", icon: "grid" },
        { path: "/mes-interventions", title: "Mes interventions", icon: "tool" },
        { path: "/notifications", title: "Messages", icon: "mail" },
        { path: "/profile", title: "User Profile", icon: "settings" },
        { path: "/qr-code", title: "QR Code", icon: "maximize" },
      ];
      return;
    }

    this.sidebarItems = [
      { path: "/dashboard-visiteur", title: "Dashboard", icon: "grid" },
      { path: "/reclamation", title: "Reclamation", icon: "alert-circle" },
      { path: "/notifications", title: "Messages", icon: "mail" },
      { path: "/profile", title: "User Profile", icon: "settings" },
      { path: "/qr-code", title: "QR Code", icon: "maximize" },
    ];
  }

  isAdmin(): boolean {
    return String(this.role || "").toUpperCase() === "ADMIN";
  }

  private isTechnicianRole(role: string): boolean {
    const technicianRoles = [
      "INFORMATICIEN",
      "ELECTRICIEN",
      "MECANICIEN",
      "PLOMBERIE",
      "TECHNICIEN",
    ];

    return technicianRoles.includes(String(role || "").toUpperCase());
  }

  private loadAiToggleState(fallbackToFalseOnError: boolean): void {
    this.aiToggleLoading = true;

    this.fetchAiEnabled()
      .pipe(finalize(() => (this.aiToggleLoading = false)))
      .subscribe({
        next: (enabled) => {
          this.aiEnabled = enabled;
        },
        error: () => {
          if (fallbackToFalseOnError) {
            this.aiEnabled = false;
          }
        },
      });
  }

  private fetchAiEnabled(): Observable<boolean> {
    return this.http.get<any>(this.aiToggleApiUrl).pipe(
      map((response) => {
        if (typeof response === "boolean") {
          return response;
        }

        if (response && typeof response.enabled === "boolean") {
          return response.enabled;
        }

        if (response && typeof response.data?.enabled === "boolean") {
          return response.data.enabled;
        }

        return false;
      })
    );
  }
}
