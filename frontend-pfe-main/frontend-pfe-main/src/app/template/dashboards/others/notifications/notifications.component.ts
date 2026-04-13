import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { NotificationService } from "src/app/services/notification.service";

@Component({
  selector: "app-notifications",
  templateUrl: "./notifications.component.html",
  styleUrls: ["./notifications.component.scss"],
})
export class NotificationsComponent implements OnInit {

  public notifications: any[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.notificationService.markAllAsRead().subscribe(
      () => {
        this.loadNotifications();
      },
      () => {
        this.loadNotifications();
      }
    );
  }

  /* 🔔 Load ALL notifications (interventions + réclamations) */
  loadNotifications() {
    this.notificationService.getMyNotifications().subscribe(
      (res: any) => {
        this.notifications = res?.data || [];
      },
      () => {
        this.notifications = [];
        this.notificationService.updateUnreadCount([]);
      }
    );
  }

  /* 🔵 CLICK */
  openNotification(notification: any) {
    if (!notification) return;

    this.notificationService.markAsRead(notification._id).subscribe(
      () => this.loadNotifications(),
      () => {}
    );

    // 🔥 Réclamation → redirect to /reclamations
    if (notification.category === "RECLAMATION") {
      this.router.navigate(["/reclamations"]);
      return;
    }

    if (notification.interventionId) {
      this.router.navigate(["/intervention", notification.interventionId]);
      return;
    }

    this.router.navigate(["/notifications"]);
  }

}