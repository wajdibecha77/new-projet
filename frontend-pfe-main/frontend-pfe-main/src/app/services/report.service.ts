import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class ReportService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Generate a PDF report and download it.
   * Returns a Blob for direct download.
   */
  public generateReport() {
    return this.http.get(`${this.baseUrl}/reports/generate`, {
      responseType: "blob",
    });
  }

  /**
   * Send the report by email to the specified address.
   */
  public sendReportByEmail(email: string) {
    return this.http.post(`${this.baseUrl}/reports/send-email`, { email });
  }

  /**
   * Get list of previously generated reports.
   */
  public getReportHistory() {
    return this.http.get<any>(`${this.baseUrl}/reports/history`);
  }

  /**
   * Download a specific report by filename.
   */
  public downloadReport(filename: string) {
    return this.http.get(`${this.baseUrl}/reports/download/${filename}`, {
      responseType: "blob",
    });
  }
}
