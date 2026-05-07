import { Component, OnInit, OnDestroy } from "@angular/core";
import {
  Router,
  NavigationStart,
  NavigationCancel,
  NavigationEnd,
} from "@angular/router";
import {
  Location,
  LocationStrategy,
  PathLocationStrategy,
} from "@angular/common";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { UserService } from "./services/user.service";
import { SidebarService } from "./services/sidebar.service";

// ðŸ”¥ IMPORTANT

declare let $: any;

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  providers: [
    Location,
    {
      provide: LocationStrategy,
      useClass: PathLocationStrategy,
    },
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private userService: UserService,
    public sidebar: SidebarService
  ) {}

  private routerSubscription: any;
  private profileImageSubscription?: Subscription;
  private profileLoadedForToken: string | null = null;

  public role: any = String(localStorage.getItem("role") || "").toUpperCase();
  public token: any = localStorage.getItem("token");
  public isConnected = false;
  public employeeNotificationsCount = 2;
  public employeeMenu: "dashboard" | "mes" = "mes";
  public sidebarProfileImageUrl: string | null = null;

  public account: any;

  /* ðŸ”¥ PUBLIC ROUTES (FIX) */
  private readonly publicRoutes = [
    "/",
    "",
    "/login",
    "/confirm-login", // ðŸ”¥ FIX HERE
    "/auth/signin",
    "/auth/signup",
    "/auth/confirm-login",
    "/auth/forgot-password",
    "/auth/login-verify-otp",
    "/auth/verify-otp",
    "/auth/reset-password",
    "/reclamation-public",
    "/suivi-reclamation",
    "/others/error-404",
    "/home",
  ];

  isPublicRoute(): boolean {
    const url = (this.router.url || "").split("?")[0];

    return this.publicRoutes.some(
      (route) =>
        url === route ||
        url.startsWith(route + "/") ||
        url.startsWith(route + "?")
    );
  }

  isAuthRoute(): boolean {
    return this.isPublicRoute();
  }

  private syncAuthState() {
    this.token = localStorage.getItem("token");
    this.role = String(localStorage.getItem("role") || "").toUpperCase();

    if (!this.token) {
      this.isConnected = false;
      this.account = null;
      this.userService.setProfileImage(null);
      this.profileLoadedForToken = null;
      return;
    }

    this.isConnected = true;

    if (this.profileLoadedForToken === this.token) return;

    this.userService.getConnectedUser().subscribe(
      (res: any) => {
        this.account = res?.data || null;
        this.userService.setProfileImage(this.account?.image || null);

        if (this.account) {
          this.account.password = "";

          if (!this.role && this.account.role) {
            this.role = String(this.account.role || "").toUpperCase();
            localStorage.setItem("role", this.role);
          }
        }

        this.profileLoadedForToken = this.token;
      },
      () => {
        this.account = null;
        this.userService.setProfileImage(null);
      }
    );
  }

 ngOnInit() {
  this.syncAuthState();
  this.initProfileImageSync();
  this.syncEmployeeMenuFromRoute();
  this.syncSidebarForViewport();
  this.initRouterEvents();

  const pathName = String(window.location.pathname || "");
  const search = String(window.location.search || "");
  const hash = String(window.location.hash || "");

  if (!hash && pathName.includes("/confirm-login")) {
    window.location.replace(`/#/confirm-login${search}`);
    return;
  }

  if ((window as any).Capacitor) {
    setTimeout(() => {
      const currentHash = String(window.location.hash || "");
      if (currentHash.includes("confirm-login")) {
        const hashPath = currentHash.replace(/^#/, "");
        if (hashPath) {
          this.router.navigateByUrl(hashPath);
        }
      }
    }, 300);
  }
}
  private isMobileViewport(): boolean {
    return typeof window !== "undefined" && window.innerWidth <= 992;
  }

  private syncSidebarForViewport(): void {
    if (!this.isMobileViewport()) {
      this.sidebar.isOpen = true;
    }
  }

  private initProfileImageSync(): void {
    const currentImage = this.userService.getProfileImageSnapshot();
    this.sidebarProfileImageUrl =
      this.userService.buildProfileImageUrl(currentImage);

    this.profileImageSubscription =
      this.userService.profileImage$.subscribe((image) => {
        this.sidebarProfileImageUrl =
          this.userService.buildProfileImageUrl(image);
      });
  }

  isEmployeePathActive(path: string): boolean {
    const currentUrl = (this.router.url || "").split("?")[0];
    return currentUrl === path || currentUrl.startsWith(path + "/");
  }

  closeEmployeeSidebar(): void {
    this.sidebar.close();
  }

  setEmployeeMenu(menu: "dashboard" | "mes"): void {
    this.employeeMenu = menu;
  }

  private syncEmployeeMenuFromRoute(): void {
    const currentUrl = (this.router.url || "").split(/[?#]/)[0];
    if (currentUrl === "/dashboard-visiteur") {
      this.employeeMenu = "mes";
    }
  }

  logout(): void {
    localStorage.clear();
    this.userService.setProfileImage(null);
    this.sidebar.close();
    this.router.navigateByUrl("/login");
  }

  initRouterEvents() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        $(".preloader").fadeIn("slow");
      }
    });

    this.routerSubscription = this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel
        )
      )
      .subscribe((event) => {
        $.getScript("assets/js/custom.js");

        $(".preloader").fadeOut("slow");

        this.syncAuthState();
        this.syncEmployeeMenuFromRoute();

        if (this.isMobileViewport()) {
          this.sidebar.close();
        } else {
          this.sidebar.isOpen = true;
        }

        // ðŸ”¥ SECURITY FIX
        const currentUrl = this.router.url || "";

// ðŸ”¥ FIX: Ù†Ø®Ù„ÙŠ confirm-login ÙŠØªØ¹Ø¯Ù‰ Ø¨Ø¯ÙˆÙ† redirect
if (currentUrl.includes("confirm-login")) {
  console.log("ðŸš€ bypass confirm-login (no redirect)");
  return;
}

if (!this.token) {
  const isPublic = this.isPublicRoute();

  if (!isPublic) {
    console.warn("ðŸ”’ Redirect â†’ login (protected route)");
    this.router.navigateByUrl("/login");
    return;
  }
}

        if (event instanceof NavigationEnd) {
          window.scrollTo(0, 0);
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.profileImageSubscription) {
      this.profileImageSubscription.unsubscribe();
    }
  }
}
