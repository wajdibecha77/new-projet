import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class NotificationService {

  // 🔥 API FIX (web + mobile)
  public base_Url = environment.apiUrl;

  private notificationsCountSubject = new BehaviorSubject<number>(0);
  public notificationsCount$ = this.notificationsCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ================= HEADERS =================
  private authHeaders() {
    const token = localStorage.getItem("token");
    return new HttpHeaders({
      "x-auth-token": token ? token : "",
    });
  }

  // ================= HELPERS =================
  private getUnreadCount(notifications: any[] = []) {
    return (notifications || []).filter(
      (notification: any) => notification?.isRead === false
    ).length;
  }

  // ================= API =================

  public getAllNotifications() {
    return this.http.get(`${this.base_Url}/notifications/all`, {
      headers: this.authHeaders(),
    });
  }

  public getMyNotifications() {
    return this.http
      .get(`${this.base_Url}/notifications/my`, {
        headers: this.authHeaders(),
      })
      .pipe(
        tap((res: any) => {
          this.updateUnreadCount(res?.data || []);
        })
      );
  }

  public refreshNotificationsCount(): Observable<number> {
    return this.getMyNotifications().pipe(
      map((res: any) => this.getUnreadCount(res?.data || []))
    );
  }

  public markAsRead(id: string) {
    return this.http
      .put(
        `${this.base_Url}/notifications/${id}/read`,
        {},
        {
          headers: this.authHeaders(),
        }
      )
      .pipe(
        tap(() => {
          this.notificationsCountSubject.next(
            Math.max(this.notificationsCountSubject.value - 1, 0)
          );
        })
      );
  }

  public markAllAsRead() {
    return this.http
      .put(
        `${this.base_Url}/notifications/read-all`,
        {},
        {
          headers: this.authHeaders(),
        }
      )
      .pipe(
        tap(() => {
          this.notificationsCountSubject.next(0);
        })
      );
  }

  // ================= STATE =================

  public updateUnreadCount(notifications: any[]) {
    this.notificationsCountSubject.next(
      this.getUnreadCount(notifications)
    );
  }
}