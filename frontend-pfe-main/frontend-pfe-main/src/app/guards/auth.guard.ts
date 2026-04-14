import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from "@angular/router";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (route.routeConfig?.path === "reclamation-public") {
      return true;
    }

    const token = localStorage.getItem("token");
    return token ? true : this.router.parseUrl("/auth/signin");
  }
}
