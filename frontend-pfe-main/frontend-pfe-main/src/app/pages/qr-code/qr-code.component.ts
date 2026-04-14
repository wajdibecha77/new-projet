import { Component } from "@angular/core";

@Component({
  selector: "app-qr-code",
  templateUrl: "./qr-code.component.html",
  styleUrls: ["./qr-code.component.scss"],
})
export class QrCodeComponent {
  public baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  public qrData = this.baseUrl + "/reclamation-public";
}
