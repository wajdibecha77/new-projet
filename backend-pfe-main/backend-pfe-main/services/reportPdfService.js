/**
 * Report PDF Generation Service
 * Generates professional PDF reports using PDFKit.
 * This is a NEW file — does NOT modify any existing logic.
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ── Brand colors (matching TAV email theme) ──
const COLORS = {
  primary: "#0B2C4D",
  accent: "#E53935",
  white: "#FFFFFF",
  lightBg: "#F7FAFE",
  border: "#DCE6F2",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textMid: "#334155",
  blue: "#3B82F6",
  green: "#22C55E",
  orange: "#F59E0B",
  purple: "#8B5CF6",
  red: "#DC2626",
};

const CATEGORY_COLORS = {
  INFORMATIQUE: COLORS.blue,
  ELECTRIQUE: COLORS.green,
  MECANIQUE: COLORS.orange,
  PLOMBERIE: COLORS.purple,
  AUTRE: COLORS.textMuted,
};

const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

/**
 * Generate a PDF report and save it to disk.
 * @param {Object} stats - Stats from reportStatsService
 * @param {Object} aiAnalysis - Analysis from reportAIService
 * @returns {Promise<string>} Path to generated PDF file
 */
function generatePdf(stats, aiAnalysis) {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "..", "uploads", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `rapport-tav-${timestamp}.pdf`;
      const filepath = path.join(reportsDir, filename);

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: {
          Title: "Rapport TAV Airports - Interventions",
          Author: "TAV Airports - Systeme IA",
          Subject: "Rapport automatique des interventions",
        },
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ── PAGE 1: Header + KPIs ──
      drawHeader(doc, stats);
      drawKpiSection(doc, stats);
      drawStatusTable(doc, stats);

      // ── PAGE 2: Details + Technicians ──
      doc.addPage();
      drawPageHeader(doc, "Analyse detaillee");
      drawCategoryBreakdown(doc, stats);
      drawTopLocations(doc, stats);
      drawTechnicianTable(doc, stats);

      // ── PAGE 3: AI Analysis ──
      doc.addPage();
      drawPageHeader(doc, "Analyse IA intelligente");
      drawAiAnalysis(doc, aiAnalysis);

      // ── Footer on all pages ──
      const pageCount = doc.bufferedPageRange();
      for (let i = 0; i < pageCount.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i + 1, pageCount.count);
      }

      doc.end();

      stream.on("finish", () => resolve(filepath));
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════════
// Drawing helpers
// ═══════════════════════════════════════════════

function drawHeader(doc, stats) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header band
  doc.save();
  doc.rect(0, 0, doc.page.width, 100).fill(COLORS.primary);
  doc.rect(0, 100, doc.page.width, 4).fill(COLORS.accent);
  doc.restore();

  // Logo text
  doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.white);
  doc.text("TAV", 50, 25, { continued: false });
  doc.font("Helvetica").fontSize(11).fillColor("#DCE7F2");
  doc.text("AIRPORTS", 50, 55);

  // Report title
  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.white);
  doc.text("Rapport d'interventions", 200, 30, { align: "right", width: pageWidth - 160 });
  doc.font("Helvetica").fontSize(11).fillColor("#DCE7F2");
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, 200, 52, { align: "right", width: pageWidth - 160 });
  doc.text(stats.monthLabel, 200, 68, { align: "right", width: pageWidth - 160 });

  doc.y = 120;
}

function drawPageHeader(doc, title) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.margins.top;

  doc.save();
  doc.rect(0, 0, doc.page.width, 60).fill(COLORS.primary);
  doc.rect(0, 60, doc.page.width, 3).fill(COLORS.accent);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.white);
  doc.text(title, 50, 20);

  doc.font("Helvetica").fontSize(9).fillColor("#DCE7F2");
  doc.text("TAV AIRPORTS", doc.page.width - 150, 25, { width: 110, align: "right" });

  doc.y = 80;
}

function drawFooter(doc, pageNum, totalPages) {
  const y = doc.page.height - 30;
  doc.save();
  doc.rect(0, y - 5, doc.page.width, 35).fill("#F1F5F9");
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.textMuted);
  doc.text(
    `Rapport genere automatiquement par le systeme IA TAV Airports  |  Page ${pageNum}/${totalPages}`,
    40,
    y + 2,
    { width: doc.page.width - 80, align: "center" }
  );
  doc.restore();
}

function drawKpiSection(doc, stats) {
  const s = stats.interventions;
  const startY = doc.y + 10;
  const cardWidth = 120;
  const cardHeight = 65;
  const gap = 12;
  const startX = doc.page.margins.left;

  const kpis = [
    { label: "Total", value: s.total, color: COLORS.blue },
    { label: "Terminee", value: s.byStatus.TERMINEE, color: COLORS.green },
    { label: "En cours", value: s.byStatus.EN_COURS, color: COLORS.orange },
    { label: "Urgentes", value: s.urgentCount, color: COLORS.red },
  ];

  kpis.forEach((kpi, i) => {
    const x = startX + i * (cardWidth + gap);
    drawKpiCard(doc, x, startY, cardWidth, cardHeight, kpi);
  });

  doc.y = startY + cardHeight + 20;

  // Resolution rate bar
  const barY = doc.y;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.textDark);
  doc.text("Taux de resolution", startX, barY);

  const barWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const barHeight = 14;
  const barStartY = barY + 18;

  doc.save();
  doc.roundedRect(startX, barStartY, barWidth, barHeight, 7).fill("#E2E8F0");
  const fillWidth = Math.max(0, (s.resolutionRate / 100) * barWidth);
  if (fillWidth > 0) {
    doc.roundedRect(startX, barStartY, fillWidth, barHeight, 7).fill(COLORS.green);
  }
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.textDark);
  doc.text(`${s.resolutionRate}%`, startX + barWidth + 5, barStartY + 2);

  doc.y = barStartY + barHeight + 20;
}

function drawKpiCard(doc, x, y, w, h, kpi) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fill(COLORS.lightBg);
  doc.roundedRect(x, y, w, h, 8).lineWidth(1).stroke(COLORS.border);

  // Color accent bar
  doc.rect(x, y, 4, h).fill(kpi.color);

  doc.font("Helvetica-Bold").fontSize(22).fillColor(kpi.color);
  doc.text(String(kpi.value), x + 14, y + 12, { width: w - 20 });

  doc.font("Helvetica").fontSize(9).fillColor(COLORS.textMuted);
  doc.text(kpi.label, x + 14, y + 40, { width: w - 20 });
  doc.restore();
}

function drawStatusTable(doc, stats) {
  const s = stats.interventions;
  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.textDark);
  doc.text("Repartition par statut", startX, doc.y);
  doc.y += 8;

  const headers = ["Statut", "Nombre", "Pourcentage"];
  const rows = Object.entries(s.byStatus).map(([status, count]) => [
    status.replace(/_/g, " "),
    String(count),
    s.total > 0 ? `${Math.round((count * 100) / s.total)}%` : "0%",
  ]);

  drawTable(doc, startX, doc.y, tableWidth, headers, rows);
}

function drawCategoryBreakdown(doc, stats) {
  const s = stats.interventions;
  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.textDark);
  doc.text("Interventions par categorie", startX, doc.y);
  doc.y += 8;

  const headers = ["Categorie", "Nombre", "Pourcentage"];
  const rows = Object.entries(s.byType).map(([type, count]) => [
    type,
    String(count),
    s.total > 0 ? `${Math.round((count * 100) / s.total)}%` : "0%",
  ]);

  drawTable(doc, startX, doc.y, tableWidth, headers, rows);
}

function drawTopLocations(doc, stats) {
  const locations = stats.interventions.topLocations;
  if (!locations || locations.length === 0) return;

  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.y += 10;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.textDark);
  doc.text("Zones les plus problematiques", startX, doc.y);
  doc.y += 8;

  const headers = ["Lieu", "Nombre d'interventions"];
  const rows = locations.map((l) => [l.lieu, String(l.count)]);

  drawTable(doc, startX, doc.y, tableWidth, headers, rows);
}

function drawTechnicianTable(doc, stats) {
  const ranking = stats.technicians.ranking;
  if (!ranking || ranking.length === 0) return;

  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  if (doc.y > 650) doc.addPage();

  doc.y += 10;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.textDark);
  doc.text("Performance des techniciens", startX, doc.y);
  doc.y += 8;

  const headers = ["Technicien", "Total", "Terminees", "En cours", "Taux"];
  const rows = ranking.map((t) => [
    t.name,
    String(t.total),
    String(t.terminee),
    String(t.enCours),
    t.total > 0 ? `${Math.round((t.terminee * 100) / t.total)}%` : "0%",
  ]);

  drawTable(doc, startX, doc.y, tableWidth, headers, rows);
}

function drawAiAnalysis(doc, aiAnalysis) {
  const analysis = aiAnalysis?.analysis || {};
  const startX = doc.page.margins.left;
  const maxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Urgency badge
  const urgency = analysis.niveauUrgence || "NORMAL";
  const urgencyColor =
    urgency === "CRITIQUE" ? COLORS.red
    : urgency === "ELEVE" ? COLORS.orange
    : urgency === "MODERE" ? COLORS.blue
    : COLORS.green;

  doc.save();
  doc.roundedRect(startX, doc.y, 180, 28, 6).fill(urgencyColor);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.white);
  doc.text(`Niveau d'urgence: ${urgency}`, startX + 10, doc.y + 8, { width: 160 });
  doc.restore();
  doc.y += 40;

  // Resume
  if (analysis.resume) {
    drawAiSection(doc, startX, maxWidth, "Resume", analysis.resume);
  }

  // Anomalies
  if (analysis.anomalies && analysis.anomalies.length > 0) {
    drawAiListSection(doc, startX, maxWidth, "Anomalies detectees", analysis.anomalies, COLORS.red);
  }

  // Zones critiques
  if (analysis.zonesCritiques && analysis.zonesCritiques.length > 0) {
    drawAiListSection(doc, startX, maxWidth, "Zones critiques", analysis.zonesCritiques, COLORS.orange);
  }

  // Tendances
  if (analysis.tendances && analysis.tendances.length > 0) {
    drawAiListSection(doc, startX, maxWidth, "Tendances", analysis.tendances, COLORS.blue);
  }

  // Recommandations
  if (analysis.recommandations && analysis.recommandations.length > 0) {
    drawAiListSection(doc, startX, maxWidth, "Recommandations", analysis.recommandations, COLORS.green);
  }

  // Performance techniciens
  if (analysis.performanceTechniciens) {
    drawAiSection(doc, startX, maxWidth, "Performance techniciens", analysis.performanceTechniciens);
  }

  // Maintenance preventive
  if (analysis.maintenancePreventive && analysis.maintenancePreventive.length > 0) {
    drawAiListSection(doc, startX, maxWidth, "Maintenance preventive", analysis.maintenancePreventive, COLORS.purple);
  }
}

function drawAiSection(doc, x, maxWidth, title, content) {
  checkPageBreak(doc, 80);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.primary);
  doc.text(title, x, doc.y, { width: maxWidth });
  doc.y += 4;

  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textMid);
  doc.text(String(content), x + 10, doc.y, { width: maxWidth - 20 });
  doc.y += 14;
}

function drawAiListSection(doc, x, maxWidth, title, items, accentColor) {
  checkPageBreak(doc, 60 + items.length * 18);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.primary);
  doc.text(title, x, doc.y, { width: maxWidth });
  doc.y += 6;

  items.forEach((item) => {
    checkPageBreak(doc, 20);
    doc.save();
    doc.circle(x + 14, doc.y + 5, 3).fill(accentColor);
    doc.restore();
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.textMid);
    doc.text(String(item), x + 24, doc.y, { width: maxWidth - 30 });
    doc.y += 4;
  });

  doc.y += 10;
}

function checkPageBreak(doc, neededSpace) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;
  if (doc.y + neededSpace > bottomLimit) {
    doc.addPage();
    doc.y = doc.page.margins.top + 10;
  }
}

// ── Generic table drawer ──
function drawTable(doc, x, startY, tableWidth, headers, rows) {
  const colCount = headers.length;
  const colWidth = tableWidth / colCount;
  const rowHeight = 22;
  let y = startY;

  // Header row
  doc.save();
  doc.rect(x, y, tableWidth, rowHeight).fill(COLORS.primary);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white);
  headers.forEach((header, i) => {
    doc.text(header, x + i * colWidth + 8, y + 6, { width: colWidth - 16 });
  });
  doc.restore();
  y += rowHeight;

  // Data rows
  rows.forEach((row, rowIdx) => {
    checkPageBreak(doc, rowHeight + 5);
    const bgColor = rowIdx % 2 === 0 ? COLORS.lightBg : COLORS.white;

    doc.save();
    doc.rect(x, y, tableWidth, rowHeight).fill(bgColor);
    doc.rect(x, y, tableWidth, rowHeight).lineWidth(0.5).stroke(COLORS.border);

    doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);
    row.forEach((cell, i) => {
      doc.text(cell, x + i * colWidth + 8, y + 6, { width: colWidth - 16 });
    });
    doc.restore();
    y += rowHeight;
  });

  doc.y = y + 10;
}

module.exports = { generatePdf };
