import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class InterventionService {

  /* ✅ API URL (centralisé) */
  public base_Url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /* ================= API ================= */

  public createIntervention(intervention: any) {
    return this.http.post(`${this.base_Url}/interventions/add-intervention`, intervention);
  }

  public getAllInterventions(includeUnassigned: boolean = false) {
    let params = new HttpParams();

    if (includeUnassigned) {
      params = params.set("includeUnassigned", "true");
    }

    return this.http.get(
      `${this.base_Url}/interventions/all`,
      { params }
    );
  }

  public getMyInterventions() {
    return this.http.get(`${this.base_Url}/interventions/my`);
  }

  public getMesDemandes() {
    return this.getMyInterventions();
  }

  public getInterventionById(id: string) {
    return this.http.get(`${this.base_Url}/interventions/id/${id}`);
  }

  public updateInterventionStatus(id: string, data: any) {
    return this.http.put(`${this.base_Url}/interventions/update/${id}`, data);
  }

  public deleteIntervention(id: string) {
    return this.http.delete(`${this.base_Url}/interventions/delete/${id}`);
  }

  public updateInterventionOrder(id: string, data: any) {
    return this.http.put(`${this.base_Url}/orders/intervention/${id}`, data);
  }
}
