import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const publicRoutes = ["/reclamation-public"];
    const currentUrl = (state.url || "").split("?")[0];

    if (publicRoutes.includes(currentUrl)) {
      return true;
    }

    const token = localStorage.getItem("token");
    return token ? true : this.router.parseUrl("/auth/signin");
  }
}
