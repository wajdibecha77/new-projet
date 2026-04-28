import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const publicRoutes = ["/", "", "/login", "/reclamation-public"];
    const currentUrl = (state.url || "").split("?")[0];
    const token = localStorage.getItem("token");

    // Allow public routes without authentication
    if (publicRoutes.includes(currentUrl)) {
      return true;
    }

    // Block protected routes if not logged in
    if (!token) {
      this.router.navigate(["/login"]);
      return false;
    }

    return true;
  }
}
