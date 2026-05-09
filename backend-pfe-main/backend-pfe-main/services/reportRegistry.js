/**
 * Report Registry — in-memory store for generated reports.
 * Tracks every PDF generated during the server session.
 * On Railway, files live in /tmp so the filesystem scan fails — this registry fixes it.
 */

const registry = [];

/**
 * Register a newly generated report.
 * @param {string} filepath - Absolute path to the PDF
 * @param {number} size - File size in bytes
 */
function registerReport(filepath) {
  const fs = require("fs");
  const path = require("path");
  const filename = path.basename(filepath);
  try {
    const stat = fs.statSync(filepath);
    registry.unshift({
      filename,
      filepath,
      size: stat.size,
      createdAt: new Date().toISOString(),
      downloadUrl: `/reports/download/${filename}`,
    });
    // Keep only last 20
    if (registry.length > 20) registry.splice(20);
    console.log(`[Registry] Registered report: ${filename} (${registry.length} total)`);
  } catch (err) {
    console.warn("[Registry] Could not stat file:", err.message);
  }
}

/**
 * Get all registered reports (newest first).
 */
function getRegisteredReports() {
  return registry;
}

/**
 * Find a registered report by filename and return its filepath.
 */
function findReportPath(filename) {
  const entry = registry.find((r) => r.filename === filename);
  return entry ? entry.filepath : null;
}

module.exports = { registerReport, getRegisteredReports, findReportPath };
