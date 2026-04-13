import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NotifierService } from "angular-notifier";
import { Order } from "src/app/models/order";
import { OrdersService } from "src/app/services/orders.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: "app-create-order-intervention",
    templateUrl: "./create-order-intervention.component.html",
    styleUrls: ["./create-order-intervention.component.scss"],
})
export class CreateOrderInterventionComponent implements OnInit {
    public order: Order;
    public successMsg: String = "";
    public errorMsg: String = "";
    public fournisseurs: any;

    constructor(
        private userService: UserService,
        private OrderService: OrdersService,
        private notifier: NotifierService,
        private router: ActivatedRoute
    ) {
        this.order = new Order();
        this.order.fournisseurId = "";
    }

    ngOnInit(): void {
        this.router.params.subscribe((params) => {
            this.order.interventionId = params["id"];
        });
        this.userService.getAllFournisseurs().subscribe((res: any) => {
            this.fournisseurs = res.data;
        });
    }

    createOrder() {
        console.log("this.order.interventionId", this.order.interventionId);
        const produit = this.order.produit ? String(this.order.produit).trim() : "";
        const quantiteMissing =
            this.order.quantite === undefined ||
            this.order.quantite === null ||
            this.order.quantite === ("" as any);
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

        this.OrderService.createOrder(this.order).subscribe(
            (res: any) => {
                this.successMsg = "Order added successfully!";
                const interventionId = this.order.interventionId;
                this.order = new Order();
                this.order.interventionId = interventionId;
                this.order.fournisseurId = "";
                setTimeout(() => {
                    window.location.href = "/commandes";
                }, 2000);
            },
            (err) => {
                console.log("err", err);
                const apiMessage =
                    err?.error?.message || err?.error?.msg || err?.error?.error;
                this.notifier.show({
                    type: "error",
                    message: apiMessage || "Erreur lors de l'ajout de la commande.",
                    id: "THAT_NOTIFICATION_ID", // Again, this is optional
                });
            }
        );
    }
}
