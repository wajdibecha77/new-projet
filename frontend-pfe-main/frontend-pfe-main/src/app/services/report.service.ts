import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class ReportService {
  private baseUrl = environment.apiUrl;

  /** Expose the base API URL so components can construct token download URLs. */
  public get apiUrl(): string {
    return this.baseUrl;
  }

  constructor(private http: HttpClient) {}

  /**
   * Generate a PDF report and download it.
   * Returns a Blob for direct download (used on PC).
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
   * Returns a Blob (used on PC).
   */
  public downloadReport(filename: string) {
    return this.http.get(`${this.baseUrl}/reports/download/${filename}`, {
      responseType: "blob",
    });
  }

  /**
   * [MOBILE] Generate a new PDF report and obtain a one-time download token.
   * The token is then used to open a direct URL that requires no JWT header.
   */
  public generateDownloadToken() {
    return this.http.post<any>(`${this.baseUrl}/reports/generate-token`, {});
  }

  /**
   * [MOBILE] Create a one-time download token for an existing report in history.
   * The token is then used to open a direct URL that requires no JWT header.
   */
  public createHistoryDownloadToken(filename: string) {
    return this.http.post<any>(`${this.baseUrl}/reports/history-token`, { filename });
  }
}
