import { Component, OnInit, OnDestroy, NgZone } from "@angular/core";
import {
  Router,
  NavigationStart,
  NavigationCancel,
  NavigationEnd,
} from "@angular/router";
import {
  Location,
} from "@angular/common";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { UserService } from "./services/user.service";
import { SidebarService } from "./services/sidebar.service";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

// ðŸ”¥ IMPORTANT

declare let $: any;

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  providers: [Location],
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private userService: UserService,
    public sidebar: SidebarService,
    private zone: NgZone
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
  this.initDeepLinkListener();
}

  private deepLinkHandled = false;

  /**
   * Deep Link handler for Capacitor Android App Links.
   * Handles both cold start (getLaunchUrl) and warm resume (appUrlOpen).
   * Uses a flag to prevent duplicate navigations.
   */
  private initDeepLinkListener(): void {
    if (!Capacitor.isNativePlatform()) return;

    // Cold start: app was launched via deep link
    CapacitorApp.getLaunchUrl().then((result: any) => {
      if (result && result.url) {
        console.log("[DeepLink] Cold start URL:", result.url);
        this.zone.run(() => this.handleDeepLinkUrl(result.url));
      }
    }).catch((err: any) => {
      console.error("[DeepLink] getLaunchUrl error:", err);
    });

    // Warm resume: app was already running, user clicked a link
    CapacitorApp.addListener("appUrlOpen", (event: { url: string }) => {
      this.zone.run(() => {
        console.log("[DeepLink] appUrlOpen:", event.url);
        this.handleDeepLinkUrl(event.url);
      });
    });
  }

  private handleDeepLinkUrl(rawUrl: string): void {
    // Prevent duplicate navigations
    if (this.deepLinkHandled) {
      console.log("[DeepLink] Already handled, skipping:", rawUrl);
      return;
    }
    this.deepLinkHandled = true;

    // Reset flag after 5 seconds to allow future deep links
    setTimeout(() => { this.deepLinkHandled = false; }, 5000);

    try {
      const url = new URL(rawUrl);
      const path = url.pathname || "/";
      const queryString = url.search || "";
      const fullRoute = path + queryString;

      console.log("[DeepLink] Navigating ONCE to:", fullRoute);
      this.router.navigateByUrl(fullRoute);
    } catch (e) {
      console.error("[DeepLink] Parse error:", e);
      const slug = rawUrl.split(".app").pop() || "/";
      this.router.navigateByUrl(slug);
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
