/**
 * Report Controller
 * API endpoints for report generation, email sending, and history.
 * This is a NEW file — does NOT modify any existing logic.
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const { gatherReportStats } = require("../services/reportStatsService");
const { analyzeWithAI } = require("../services/reportAIService");
const { generatePdf } = require("../services/reportPdfService");
const { sendEmail, sendEmailWithAttachment } = require("../services/email.service");
const User = require("../models/User");

// ── In-memory report registry (persists for the lifetime of the server process) ──
const reportRegistry = [];

// ── One-time download token store for mobile-friendly PDF downloads ──
// Mobile browsers cannot reliably navigate blob URLs across tabs.
// Instead, the frontend requests a short-lived token (authenticated),
// then opens  GET /reports/download-token/:token  which needs no JWT header.
const downloadTokenStore = new Map(); // token → { filePath, filename, expires }
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Purge expired tokens every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [tok, data] of downloadTokenStore.entries()) {
    if (data.expires < now) downloadTokenStore.delete(tok);
  }
}, 5 * 60 * 1000);

/** Create a one-time download token for a given PDF file path. */
function createDownloadToken(filePath) {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  downloadTokenStore.set(token, {
    filePath,
    filename: path.basename(filePath),
    expires: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

/**
 * Get the reports directory (Railway /tmp or local uploads/reports)
 */
function getReportsDir() {
  const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  return isRailway ? os.tmpdir() : path.join(__dirname, "..", "uploads", "reports");
}

/**
 * Register a generated PDF into the in-memory registry.
 */
function registerReport(filePath) {
  const filename = path.basename(filePath);
  const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  reportRegistry.unshift({
    filename,
    fullPath: filePath,
    size: stat ? stat.size : 0,
    createdAt: new Date().toISOString(),
  });
  // Keep only last 20 reports
  if (reportRegistry.length > 20) reportRegistry.splice(20);
}

module.exports = {
  /**
   * GET /reports/generate
   * Generate a PDF report with AI analysis and return it as download.
   */
  generateReport: async (req, res) => {
    try {
      // Verify admin role
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      console.log("[Report] Generating report... Node:", process.version, "ENV:", process.env.RAILWAY_ENVIRONMENT || "local");

      // 1. Gather stats
      console.log("[Report] Step 1: Gathering stats...");
      const stats = await gatherReportStats();
      console.log("[Report] Stats OK. Interventions:", stats.interventions.total);

      // 2. AI analysis
      console.log("[Report] Step 2: AI analysis...");
      const aiResult = await analyzeWithAI(stats);
      console.log("[Report] AI OK. Success:", aiResult.success);

      // 3. Generate PDF
      console.log("[Report] Step 3: Generating PDF...");
      const pdfPath = await generatePdf(stats, aiResult);
      console.log("[Report] PDF generated at:", pdfPath);
      registerReport(pdfPath);

      // 4. Send file
      const filename = path.basename(pdfPath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const stream = fs.createReadStream(pdfPath);
      stream.pipe(res);
      stream.on("error", (err) => {
        console.error("[Report] Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Erreur lecture du PDF: " + err.message });
        }
      });
    } catch (err) {
      console.error("[Report] Generate error FULL:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur generation rapport", stack: process.env.NODE_ENV !== "production" ? err.stack : undefined });
    }
  },

  /**
   * POST /reports/generate-token
   * Generate a PDF report and return a short-lived one-time download token.
   * Used by mobile clients that cannot reliably handle blob URLs.
   */
  generateDownloadToken: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      console.log("[Report] Generating PDF for token download...");
      const stats = await gatherReportStats();
      const aiResult = await analyzeWithAI(stats);
      const pdfPath = await generatePdf(stats, aiResult);
      registerReport(pdfPath);

      const token = createDownloadToken(pdfPath);
      console.log("[Report] Download token created:", token.slice(0, 8) + "...");

      res.json({
        success: true,
        token,
        filename: path.basename(pdfPath),
        expiresInSeconds: TOKEN_TTL_MS / 1000,
      });
    } catch (err) {
      console.error("[Report] Generate token error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur generation rapport" });
    }
  },

  /**
   * POST /reports/history-token
   * Body: { filename: string }
   * Create a one-time download token for an already-generated report in the registry.
   * Used by mobile clients when downloading from the history modal.
   */
  createHistoryDownloadToken: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      const filename = String(req.body?.filename || "").replace(/[^a-zA-Z0-9._-]/g, "");
      if (!filename) {
        return res.status(400).json({ success: false, message: "Nom de fichier requis" });
      }

      // Search in registry first, then fallback directories
      const registered = reportRegistry.find((r) => r.filename === filename);
      let filePath = registered?.fullPath;

      if (!filePath || !fs.existsSync(filePath)) {
        const candidates = [
          path.join(os.tmpdir(), filename),
          path.join(__dirname, "..", "uploads", "reports", filename),
        ];
        filePath = candidates.find((p) => fs.existsSync(p)) || null;
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Rapport introuvable ou expiré" });
      }

      const token = createDownloadToken(filePath);
      res.json({ success: true, token, filename, expiresInSeconds: TOKEN_TTL_MS / 1000 });
    } catch (err) {
      console.error("[Report] History token error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur creation token" });
    }
  },

  /**
   * GET /reports/download-token/:token
   * NO authentication required — the token IS the credential.
   * Token is one-time: deleted immediately after first use.
   * Allows mobile browsers to open a plain URL and receive the PDF file.
   */
  downloadByToken: async (req, res) => {
    try {
      const token = String(req.params.token || "").replace(/[^a-f0-9]/gi, "");

      if (!token) {
        return res.status(400).json({ success: false, message: "Token manquant" });
      }

      const data = downloadTokenStore.get(token);

      if (!data) {
        return res.status(404).json({ success: false, message: "Token invalide" });
      }

      if (data.expires < Date.now()) {
        downloadTokenStore.delete(token);
        return res.status(410).json({ success: false, message: "Lien de telechargement expire" });
      }

      if (!fs.existsSync(data.filePath)) {
        downloadTokenStore.delete(token);
        return res.status(404).json({ success: false, message: "Fichier PDF introuvable" });
      }

      // Consume the token (one-time use)
      downloadTokenStore.delete(token);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
      res.setHeader("Cache-Control", "no-store, no-cache");
      res.setHeader("Pragma", "no-cache");

      const stream = fs.createReadStream(data.filePath);
      stream.pipe(res);
      stream.on("error", (err) => {
        console.error("[Report] Token download stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Erreur lecture PDF" });
        }
      });
    } catch (err) {
      console.error("[Report] Download by token error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur telechargement" });
    }
  },

  /**
   * POST /reports/send-email
   * Generate a report and send it by email to the requesting admin (or specified email).
   */
  sendReportByEmail: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role email name");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      const recipientEmail = String(req.body?.email || me.email || "").trim();
      if (!recipientEmail) {
        return res.status(400).json({ success: false, message: "Email destinataire requis" });
      }

      console.log("[Report] Generating report for email to:", recipientEmail);

      console.log("[Report] Step 1: Gathering stats...");
      const stats = await gatherReportStats();
      console.log("[Report] Stats OK.");

      console.log("[Report] Step 2: AI analysis...");
      const aiResult = await analyzeWithAI(stats);
      console.log("[Report] AI OK.");

      console.log("[Report] Step 3: Generating PDF...");
      const pdfPath = await generatePdf(stats, aiResult);
      console.log("[Report] PDF OK:", pdfPath);
      registerReport(pdfPath);


      const dateStr = new Date().toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f8fafc;">
          <table width="600" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <tr><td style="background:#0B2C4D;padding:20px 28px;">
              <div style="color:#fff;font-size:24px;font-weight:700;">TAV</div>
              <div style="color:#b0c4d8;font-size:11px;letter-spacing:1px;">AIRPORTS</div>
            </td></tr>
            <tr><td style="height:4px;background:#E53935;"></td></tr>
            <tr><td style="padding:28px;">
              <p style="font-size:18px;font-weight:700;color:#0B2C4D;margin:0 0 12px;">Rapport Mensuel TAV Airports</p>
              <p style="color:#374151;margin:0 0 8px;">Bonjour ${me.name || "Admin"},</p>
              <p style="color:#374151;margin:0 0 16px;">Veuillez trouver en pièce jointe le rapport des interventions généré le <strong>${dateStr}</strong>.</p>
              <div style="background:#f0f7ff;border-left:4px solid #3B82F6;padding:12px 16px;border-radius:4px;margin:16px 0;">
                <p style="margin:0;color:#1e40af;font-size:13px;">📎 Le fichier PDF est joint à cet email.</p>
              </div>
              <p style="color:#6b7280;font-size:12px;margin:20px 0 0;">Ce rapport a été généré automatiquement par le système IA TAV Airports.</p>
            </td></tr>
            <tr><td style="background:#082038;color:#8fa3b8;text-align:center;padding:14px;font-size:11px;">
              TAV Airports &copy; ${new Date().getFullYear()} — Document confidentiel
            </td></tr>
          </table>
        </div>
      `;

      const pdfFilename = `rapport-tav-${new Date().toISOString().slice(0, 10)}.pdf`;

      await sendEmailWithAttachment(
        recipientEmail,
        `Rapport TAV Airports - ${dateStr}`,
        htmlBody,
        pdfPath,
        pdfFilename
      );

      console.log("[Report] Email with PDF attachment sent to:", recipientEmail);

      res.json({
        success: true,
        message: `Rapport envoyé avec pièce jointe PDF à ${recipientEmail}`,
        pdfFile: path.basename(pdfPath),
      });
    } catch (err) {
      console.error("[Report] Email error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur envoi email" });
    }
  },

  /**
   * GET /reports/history
   * List all previously generated reports (from in-memory registry).
   */
  getReportHistory: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      // Return reports from in-memory registry (valid for current server session)
      const reports = reportRegistry
        .filter((r) => fs.existsSync(r.fullPath)) // only existing files
        .map((r) => ({
          filename: r.filename,
          size: r.size,
          createdAt: r.createdAt,
          downloadUrl: `/reports/download/${r.filename}`,
        }));

      res.json({ success: true, reports });
    } catch (err) {
      console.error("[Report] History error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur historique" });
    }
  },

  /**
   * GET /reports/download/:filename
   * Download a specific report file (searches in registry and fallback dirs).
   */
  downloadReport: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      const filename = String(req.params.filename || "").replace(/[^a-zA-Z0-9._-]/g, "");

      // Search in registry first
      const registered = reportRegistry.find((r) => r.filename === filename);
      let filePath = registered?.fullPath;

      // Fallback: search in common directories
      if (!filePath || !fs.existsSync(filePath)) {
        const candidates = [
          path.join(os.tmpdir(), filename),
          path.join(__dirname, "..", "uploads", "reports", filename),
        ];
        filePath = candidates.find((p) => fs.existsSync(p)) || null;
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Rapport introuvable ou expiré" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error("[Report] Download error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur telechargement" });
    }
  },
};
