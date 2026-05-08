/**
 * Report Controller
 * API endpoints for report generation, email sending, and history.
 * This is a NEW file — does NOT modify any existing logic.
 */

const path = require("path");
const fs = require("fs");
const { gatherReportStats } = require("../services/reportStatsService");
const { analyzeWithAI } = require("../services/reportAIService");
const { generatePdf } = require("../services/reportPdfService");
const { sendEmail } = require("../services/email.service");
const User = require("../models/User");

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

      const dateStr = new Date().toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2 style="color:#0B2C4D;">Rapport TAV Airports</h2>
          <p>Bonjour ${me.name || "Admin"},</p>
          <p>Veuillez trouver ci-joint le rapport des interventions genere le ${dateStr}.</p>
          <p style="color:#64748B;font-size:13px;margin-top:20px;">
            Ce rapport a ete genere automatiquement par le systeme IA TAV Airports.
          </p>
        </div>
      `;

      await sendEmail(
        recipientEmail,
        `Rapport TAV Airports - ${dateStr}`,
        htmlBody
      );

      res.json({
        success: true,
        message: `Rapport envoye a ${recipientEmail}`,
        pdfFile: path.basename(pdfPath),
      });
    } catch (err) {
      console.error("[Report] Email error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur envoi email" });
    }
  },

  /**
   * GET /reports/history
   * List all previously generated reports.
   */
  getReportHistory: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      const reportsDir = path.join(__dirname, "..", "uploads", "reports");
      if (!fs.existsSync(reportsDir)) {
        return res.json({ success: true, reports: [] });
      }

      const files = fs.readdirSync(reportsDir)
        .filter((f) => f.endsWith(".pdf"))
        .sort((a, b) => b.localeCompare(a))
        .map((filename) => {
          const filePath = path.join(reportsDir, filename);
          const stat = fs.statSync(filePath);
          return {
            filename,
            size: stat.size,
            createdAt: stat.mtime.toISOString(),
            downloadUrl: `/uploads/reports/${filename}`,
          };
        });

      res.json({ success: true, reports: files });
    } catch (err) {
      console.error("[Report] History error:", err);
      res.status(500).json({ success: false, message: err.message || "Erreur historique" });
    }
  },

  /**
   * GET /reports/download/:filename
   * Download a specific report file.
   */
  downloadReport: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me || String(me.role).toUpperCase() !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Acces reserve aux administrateurs" });
      }

      const filename = String(req.params.filename || "").replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = path.join(__dirname, "..", "uploads", "reports", filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Rapport introuvable" });
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
