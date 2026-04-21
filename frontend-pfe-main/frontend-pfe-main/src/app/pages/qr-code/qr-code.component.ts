import { Component, OnInit } from "@angular/core";
import { environment } from "src/environments/environment";

@Component({
  selector: "app-qr-code",
  templateUrl: "./qr-code.component.html",
  styleUrls: ["./qr-code.component.scss"],
})
export class QrCodeComponent implements OnInit {
  public qrCodeUrl: string = "";

  ngOnInit(): void {
    const origin =
      environment.production && environment.publicUrl
        ? environment.publicUrl
        : typeof window !== "undefined"
          ? window.location.origin
          : "";

    this.qrCodeUrl = `${origin}/#/reclamation-public`;
    console.log("QR URL generated:", this.qrCodeUrl);
  }
}
