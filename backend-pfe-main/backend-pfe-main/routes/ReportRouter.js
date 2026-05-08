/**
 * Report Router
 * All routes are protected by isauth middleware and restricted to ADMIN role.
 * This is a NEW file — does NOT modify any existing routes.
 */

const express = require("express");
const router = express.Router();
const isauth = require("../middlewares/isauth");
const {
  generateReport,
  sendReportByEmail,
  getReportHistory,
  downloadReport,
} = require("../controllers/ReportController");

router.get("/generate", isauth, generateReport);
router.post("/send-email", isauth, sendReportByEmail);
router.get("/history", isauth, getReportHistory);
router.get("/download/:filename", isauth, downloadReport);

module.exports = router;
