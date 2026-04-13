import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ServiceUserService } from "src/app/services/service-user.service";

@Component({
  selector: "app-listing-services",
  templateUrl: "./listing-services.component.html",
  styleUrls: ["./listing-services.component.scss"],
})
export class ListingServicesComponent implements OnInit {
  public services: any[] = [];

  constructor(
    private serviceProvider: ServiceUserService,
    private router: Router
  ) {}

  public getServices() {
    this.serviceProvider.getAllServices().subscribe((res: any) => {
      this.services = res.data || [];
    });
  }

  ngOnInit(): void {
    this.getServices();
  }

  deleteService(id: string) {
    this.serviceProvider.deleteService(id).subscribe({
      next: () => {
        this.services = this.services.filter(s => s._id !== id);
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  goToEditService(id: string) {
    this.router.navigate(["/create-service", id]);
  }
}