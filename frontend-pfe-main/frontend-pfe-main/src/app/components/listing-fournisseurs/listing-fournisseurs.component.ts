import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Fournisseur } from "src/app/models/fournisseur";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-listing-fournisseurs",
  templateUrl: "./listing-fournisseurs.component.html",
  styleUrls: ["./listing-fournisseurs.component.scss"],
})
export class ListingFournisseursComponent implements OnInit {
  public fournisseurs: Fournisseur[] = [];

  constructor(private userService: UserService, private router: Router) {}

  getAllFournisseurs() {
    this.userService.getAllFournisseurs().subscribe((res: any) => {
      this.fournisseurs = (res.data || []).reverse();
    });
  }

  ngOnInit(): void {
    this.getAllFournisseurs();
  }

  deleteFournisseur(id: string) {
    this.userService.deleteFournisseur(id).subscribe({
      next: () => {
        this.fournisseurs = this.fournisseurs.filter(
          f => (f as any)._id !== id
        );
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  goToCreateFournisseur() {
    this.router.navigateByUrl("/create-fournisseur");
  }

  goToEditFournisseur(id: string) {
    this.router.navigate(["/create-fournisseur", id]);
  }
}