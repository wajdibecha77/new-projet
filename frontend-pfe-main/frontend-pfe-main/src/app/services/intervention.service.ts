import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class InterventionService {

  /* ✅ API URL (centralisé) */
  public base_Url = environment.apiUrl;

  public isConnected: boolean = false;

  constructor(private http: HttpClient) {}

  /* ================= HEADERS ================= */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem("token");

    if (token) {
      this.isConnected = true;
    }

    return new HttpHeaders({
      "x-auth-token": token ? token : "",
    });
  }

  /* ================= API ================= */

  public createIntervention(intervention: any) {
    return this.http.post(
      `${this.base_Url}/interventions/add-intervention`,
      intervention,
      { headers: this.getHeaders() }
    );
  }

  public getAllInterventions(includeUnassigned: boolean = false) {
    let params = new HttpParams();

    if (includeUnassigned) {
      params = params.set("includeUnassigned", "true");
    }

    return this.http.get(
      `${this.base_Url}/interventions/all`,
      { headers: this.getHeaders(), params }
    );
  }

  public getMyInterventions() {
    return this.http.get(
      `${this.base_Url}/interventions/my`,
      { headers: this.getHeaders() }
    );
  }

  public getMesDemandes() {
    return this.getMyInterventions();
  }

  public getInterventionById(id: string) {
    return this.http.get(
      `${this.base_Url}/interventions/id/${id}`,
      { headers: this.getHeaders() }
    );
  }

  public updateInterventionStatus(id: string, data: any) {
    return this.http.put(
      `${this.base_Url}/interventions/update/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  public deleteIntervention(id: string) {
    return this.http.delete(
      `${this.base_Url}/interventions/delete/${id}`,
      { headers: this.getHeaders() }
    );
  }

  public updateInterventionOrder(id: string, data: any) {
    return this.http.put(
      `${this.base_Url}/orders/intervention/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }
}
