import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ReclamationService {

  private API = environment.apiUrl;
  private PUBLIC_API = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log("🔥 RECLAMATION API =", this.API);
  }

  /* 🔐 AUTH HEADER */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token") || "";
    return new HttpHeaders({
      "x-auth-token": token
    });
  }

  /* ================= CREATE ================= */
  addReclamation(data: any, isPublic = false): Observable<any> {
    if (isPublic) {
      return this.http.post(`${this.PUBLIC_API}/reclamations/public`, data);
    }

    return this.http.post(`${this.API}/reclamations/add`, data, {
      headers: this.getAuthHeaders()
    });
  }

  trackReclamation(code: string): Observable<any> {
    return this.http.get(`${this.PUBLIC_API}/reclamations/track/${encodeURIComponent(code)}`);
  }

  /* ================= GET ALL ================= */
  getReclamations(): Observable<any> {
    return this.http.get(
      `${this.API}/reclamations/all`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /* ================= ACCEPT ================= */
  acceptReclamation(id: string): Observable<any> {
    return this.http.put(
      `${this.API}/reclamations/accept/${id}`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /* ================= REFUSE ================= */
  refuseReclamation(id: string): Observable<any> {
    return this.http.put(
      `${this.API}/reclamations/refuse/${id}`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

}
