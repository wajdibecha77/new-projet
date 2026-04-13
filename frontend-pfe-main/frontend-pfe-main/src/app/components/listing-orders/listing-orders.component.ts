import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { OrdersService } from "src/app/services/orders.service";

@Component({
  selector: "app-listing-orders",
  templateUrl: "./listing-orders.component.html",
  styleUrls: ["./listing-orders.component.scss"],
})
export class ListingOrdersComponent implements OnInit {
  public orders: any[] = [];
  public role = localStorage.getItem("role");

  constructor(private orderService: OrdersService, private router: Router) {}

  getOrders() {
    this.orderService.getAllOrders().subscribe((res: any) => {
      this.orders = (res.data || []).reverse();
    });
  }

  ngOnInit(): void {
    this.getOrders();
  }

  updateOrderStat(stat: string, id: string) {
    const params = { status: stat };
    this.orderService.updateOrderStatus(id, params).subscribe({
      next: () => this.getOrders(),
      error: (err) => console.error(err),
    });
  }

  deleteOrder(id: string) {
    this.orderService.deleteOrder(id).subscribe({
      next: () => {
        this.orders = this.orders.filter((o: any) => o._id !== id);
      },
      error: (err) => console.error(err),
    });
  }

  // ✅ FIXED
 goToEditOrder(order: any) {
  this.router.navigate(["/create-order", order._id], { state: { order } });
}
}