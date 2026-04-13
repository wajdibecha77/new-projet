import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class ServiceUserService {

  // 🔥 API (web + mobile)
  public base_Url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ================= HEADERS =================
  private authHeaders() {
    const token = localStorage.getItem("token");
    return new HttpHeaders({
      "x-auth-token": token ? token : "",
    });
  }

  // ================= API =================

  // ➕ ADD SERVICE
  public addService(service: any) {
    return this.http.post(
      `${this.base_Url}/services/add-service`,
      {
        name: service.name,
        email: service.email,
        tel: service.tel,
      },
      { headers: this.authHeaders() }
    );
  }

  // 📋 GET ALL
  public getAllServices() {
    return this.http.get(
      `${this.base_Url}/services/getAllSerives`,
      { headers: this.authHeaders() }
    );
  }

  // 🔍 GET BY ID
  public getServiceById(id: string) {
    return this.http.get(
      `${this.base_Url}/services/getService/${id}`,
      { headers: this.authHeaders() }
    );
  }

  // ✏️ UPDATE
  public updateService(id: string, service: any) {
    return this.http.put(
      `${this.base_Url}/services/updateService/${id}`,
      service,
      { headers: this.authHeaders() }
    );
  }

  // 🗑️ DELETE
  public deleteService(id: string) {
    return this.http.delete(
      `${this.base_Url}/services/delete/${id}`,
      { headers: this.authHeaders() }
    );
  }
}