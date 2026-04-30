import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class ChatbotService {
  private readonly apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token") || "";
    return new HttpHeaders({
      "x-auth-token": token,
    });
  }

  sendMessage(message: string): Observable<any> {
    return this.http.post(
      this.apiUrl,
      { message },
      { headers: this.getAuthHeaders() }
    );
  }
}
