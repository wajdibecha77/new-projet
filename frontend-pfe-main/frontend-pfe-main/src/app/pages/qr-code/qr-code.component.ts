import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-qr-code",
  templateUrl: "./qr-code.component.html",
  styleUrls: ["./qr-code.component.scss"],
})
export class QrCodeComponent implements OnInit {
  public qrCodeUrl: string = "";

  ngOnInit(): void {
    this.qrCodeUrl =
      (typeof window !== "undefined" ? window.location.origin : "") +
      "/reclamation-public";
    console.log("QR URL generated:", this.qrCodeUrl);
  }
}
