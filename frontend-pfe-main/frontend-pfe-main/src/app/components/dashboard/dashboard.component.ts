import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";
import { SidebarService } from "src/app/services/sidebar.service";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(public sidebar: SidebarService, private router: Router) {}

  ngOnInit(): void {
    this.syncSidebarWithViewport();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.isMobileViewport()) {
          this.sidebar.close();
          return;
        }

        this.sidebar.isOpen = true;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeMobileSidebar(): void {
    if (this.isMobileViewport()) {
      this.sidebar.close();
    }
  }

  @HostListener("window:resize")
  onResize(): void {
    this.syncSidebarWithViewport();
  }

  private syncSidebarWithViewport(): void {
    if (this.isMobileViewport()) {
      this.sidebar.close();
      return;
    }

    this.sidebar.isOpen = true;
  }

  private isMobileViewport(): boolean {
    return typeof window !== "undefined" && window.innerWidth < 992;
  }
}
