import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  private readonly publicApiPaths = [
    "/reclamations/add-public",
    "/reclamations/public",
    "/reclamations/track/",
  ];

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (req.url.includes("/reclamations/add-public")) {
      return next.handle(req);
    }

    const token = localStorage.getItem("token");
    const request = token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            "x-auth-token": token,
          },
        })
      : req;

    const isPublicRequest = this.publicApiPaths.some((path) =>
      request.url.includes(path)
    );
    const currentUrl = (this.router.url || "").split("?")[0];
    const isPublicPage =
      currentUrl === "/reclamation-public" || currentUrl === "/suivi-reclamation";

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isPublicRequest && !isPublicPage) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");
          this.router.navigate(["/login"]);
        }
        return throwError(error);
      })
    );
  }
}
