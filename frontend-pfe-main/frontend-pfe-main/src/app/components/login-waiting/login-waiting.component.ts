import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
  selector: "app-login-waiting",
  templateUrl: "./login-waiting.component.html",
  styleUrls: ["./login-waiting.component.scss"],
})
export class LoginWaitingComponent implements OnInit {
  public email: string = "";

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get("email") || "";
    if (!this.email) this.router.navigate(["/auth/signin"]);
  }
}