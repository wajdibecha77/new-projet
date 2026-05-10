/**
 * Report Router
 * Standard routes are protected by isauth middleware (ADMIN role enforced in controller).
 * The /download-token/:token route is intentionally public — the one-time token IS the auth.
 */

const express = require("express");
const router = express.Router();
const isauth = require("../middlewares/isauth");
const {
  generateReport,
  sendReportByEmail,
  getReportHistory,
  downloadReport,
  generateDownloadToken,
  createHistoryDownloadToken,
  downloadByToken,
} = require("../controllers/ReportController");

// ── Standard routes (JWT required) ──
router.get("/generate", isauth, generateReport);
router.post("/send-email", isauth, sendReportByEmail);
router.get("/history", isauth, getReportHistory);
router.get("/download/:filename", isauth, downloadReport);

// ── Mobile token-based download routes ──
// POST /reports/generate-token   → generate PDF + return one-time token (JWT required)
// POST /reports/history-token    → create token for existing report (JWT required)
// GET  /reports/download-token/:token → serve PDF using token (NO JWT — token is the auth)
router.post("/generate-token", isauth, generateDownloadToken);
router.post("/history-token", isauth, createHistoryDownloadToken);
router.get("/download-token/:token", downloadByToken);

module.exports = router;
