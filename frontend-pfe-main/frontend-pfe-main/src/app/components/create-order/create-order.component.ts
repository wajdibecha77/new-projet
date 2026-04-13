import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { Order } from "src/app/models/order";
import { OrdersService } from "src/app/services/orders.service";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-create-order",
  templateUrl: "./create-order.component.html",
  styleUrls: ["./create-order.component.scss"],
})
export class CreateOrderComponent implements OnInit {
  public order: any = new Order();
  public fournisseurs: any[] = [];

  public successMsg: String = "";
  public errorMsg: String = "";

  public isEditMode: boolean = false;
  public orderId: string = "";

  constructor(
    private userService: UserService,
    private orderService: OrdersService,
    private notifier: NotifierService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.order.fournisseurId = "";
  }

  ngOnInit(): void {
    // ✅ Load fournisseurs
    this.userService.getAllFournisseurs().subscribe((res: any) => {
      this.fournisseurs = res.data || [];
    });

    // ✅ Check edit mode
    this.orderId = this.route.snapshot.paramMap.get("id") || "";
    this.isEditMode = !!this.orderId;

    if (!this.isEditMode) return;

    // ✅ 1) Try to get order from navigation state (best)
    const stateOrder = history.state?.order; // ✅ works even without getCurrentNavigation
    if (stateOrder && stateOrder._id) {
      this.order = stateOrder;
      if (!this.order.fournisseurId) this.order.fournisseurId = "";
      return;
    }

    // ✅ 2) Fallback: try API getOrderById (for refresh case)
    this.orderService.getOrderById(this.orderId).subscribe({
      next: (res: any) => {
        this.order = res.data || res;
        if (!this.order.fournisseurId) this.order.fournisseurId = "";
      },
      error: (err) => {
        console.error(err);
        this.notifier.show({
          type: "error",
          message: "Impossible de charger la commande.",
          id: "THAT_NOTIFICATION_ID",
        });
      },
    });
  }

  saveOrder() {
    const produit = this.order.produit ? String(this.order.produit).trim() : "";
    const quantiteMissing =
      this.order.quantite === undefined ||
      this.order.quantite === null ||
      (this.order.quantite as any) === "";
    const fournisseurMissing =
      !this.order.fournisseurId ||
      String(this.order.fournisseurId).trim() === "";

    if (!produit || quantiteMissing || fournisseurMissing) {
      this.notifier.show({
        type: "error",
        message: "Veuillez remplir produit, quantité et fournisseur.",
        id: "THAT_NOTIFICATION_ID",
      });
      return;
    }

    // ✅ EDIT
    if (this.isEditMode) {
      this.orderService.updateOrder(this.orderId, this.order).subscribe({
        next: () => {
          this.successMsg = "Commande modifiée avec succès !";
          setTimeout(() => this.router.navigateByUrl("/commandes"), 800);
        },
        error: (err) => {
          console.error(err);
          const apiMessage =
            err?.error?.message || err?.error?.msg || err?.error?.error;
          this.notifier.show({
            type: "error",
            message: apiMessage || "Erreur lors de la modification.",
            id: "THAT_NOTIFICATION_ID",
          });
        },
      });
      return;
    }

    // ✅ CREATE
    this.orderService.createOrder(this.order).subscribe({
      next: () => {
        this.successMsg = "Commande ajoutée avec succès !";
        this.order = new Order();
        this.order.fournisseurId = "";
        setTimeout(() => this.router.navigateByUrl("/commandes"), 800);
      },
      error: (err) => {
        console.error(err);
        const apiMessage =
          err?.error?.message || err?.error?.msg || err?.error?.error;
        this.notifier.show({
          type: "error",
          message: apiMessage || "Erreur lors de l'ajout de la commande.",
          id: "THAT_NOTIFICATION_ID",
        });
      },
    });
  }
}