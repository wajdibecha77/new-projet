import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class OrdersService {

  // 🔥 API (web + mobile)
  public base_Url = environment.apiUrl;

  public isConnected: boolean = false;

  constructor(private http: HttpClient) {}

  // ================= HEADERS =================
  private authHeaders() {
    const token = localStorage.getItem("token");

    if (token) {
      this.isConnected = true;
    }

    return new HttpHeaders({
      "x-auth-token": token ? token : "",
    });
  }

  // ================= API =================

  // ➕ CREATE
  public createOrder(payload: any) {
    return this.http.post(
      `${this.base_Url}/orders`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  // 📋 GET ALL
  public getAllOrders() {
    return this.http.get(
      `${this.base_Url}/orders/all`,
      { headers: this.authHeaders() }
    );
  }

  // 🔍 GET BY ID
  public getOrderById(id: string) {
    return this.http.get(
      `${this.base_Url}/orders/one/${id}`,
      { headers: this.authHeaders() }
    );
  }

  // ✏️ UPDATE
  public updateOrder(id: string, payload: any) {
    return this.http.put(
      `${this.base_Url}/orders/one/${id}`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  // 🔄 UPDATE STATUS (🔥 FIX ترتيب params)
  public updateOrderStatus(id: string, payload: any) {
    return this.http.put(
      `${this.base_Url}/orders/${id}`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  // 🗑️ DELETE
  public deleteOrder(id: string) {
    return this.http.delete(
      `${this.base_Url}/orders/${id}`,
      { headers: this.authHeaders() }
    );
  }
}