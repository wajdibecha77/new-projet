/**
 * Report CRON Service
 * Schedules automatic daily report generation at 23:00.
 * This is a NEW file — does NOT modify any existing logic.
 */

const cron = require("node-cron");
const path = require("path");
const fs = require("fs");
const { gatherReportStats } = require("./reportStatsService");
const { analyzeWithAI } = require("./reportAIService");
const { generatePdf } = require("./reportPdfService");
const { sendEmail } = require("./email.service");
const User = require("../models/User");

/**
 * Generate report, analyze with AI, create PDF, email to all admins.
 */
async function runDailyReport() {
  console.log("[CRON][Report] Starting daily report generation...");

  try {
    // 1. Gather statistics
    const stats = await gatherReportStats();
    console.log("[CRON][Report] Statistics gathered.");

    // 2. AI analysis
    const aiResult = await analyzeWithAI(stats);
    console.log("[CRON][Report] AI analysis complete. Success:", aiResult.success);

    // 3. Generate PDF
    const pdfPath = await generatePdf(stats, aiResult);
    console.log("[CRON][Report] PDF generated:", pdfPath);

    // 4. Send email to all admins
    const admins = await User.find({ role: "ADMIN" }).select("email name");
    if (!admins || admins.length === 0) {
      console.warn("[CRON][Report] No admins found. Skipping email.");
      return { success: true, pdfPath, emailsSent: 0 };
    }

    const dateStr = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlBody = buildReportEmailHtml(stats, dateStr);

    let emailsSent = 0;
    for (const admin of admins) {
      try {
        await sendEmail(
          admin.email,
          `Rapport quotidien TAV Airports - ${dateStr}`,
          htmlBody
        );
        emailsSent++;
        console.log(`[CRON][Report] Email sent to ${admin.email}`);
      } catch (emailErr) {
        console.error(`[CRON][Report] Failed to send email to ${admin.email}:`, emailErr.message);
      }
    }

    console.log(`[CRON][Report] Daily report complete. Emails sent: ${emailsSent}/${admins.length}`);
    return { success: true, pdfPath, emailsSent };
  } catch (err) {
    console.error("[CRON][Report] Daily report failed:", err.message);
    return { success: false, error: err.message };
  }
}

function buildReportEmailHtml(stats, dateStr) {
  const s = stats.interventions;
  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rapport quotidien TAV</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F6;font-family:Arial,sans-serif;color:#16283B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:680px;max-width:680px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(11,44,77,0.14);">
          <tr>
            <td style="background:#0B2C4D;padding:22px 24px;color:#FFFFFF;">
              <div style="font-size:30px;font-weight:700;letter-spacing:1px;line-height:1;">TAV</div>
              <div style="font-size:12px;opacity:0.9;padding-top:3px;letter-spacing:1px;">AIRPORTS</div>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#E53935;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 30px;">
              <div style="font-size:24px;font-weight:700;color:#0B2C4D;margin-bottom:6px;">Rapport quotidien</div>
              <div style="font-size:14px;color:#64748B;margin-bottom:20px;">${dateStr}</div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:8px;">
                    <div style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#3B82F6;">${s.total}</div>
                      <div style="font-size:12px;color:#64748B;">Total interventions</div>
                    </div>
                  </td>
                  <td style="padding:8px;">
                    <div style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#22C55E;">${s.byStatus.TERMINEE}</div>
                      <div style="font-size:12px;color:#64748B;">Terminees</div>
                    </div>
                  </td>
                  <td style="padding:8px;">
                    <div style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#DC2626;">${s.urgentCount}</div>
                      <div style="font-size:12px;color:#64748B;">Urgentes</div>
                    </div>
                  </td>
                  <td style="padding:8px;">
                    <div style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#F59E0B;">${s.resolutionRate}%</div>
                      <div style="font-size:12px;color:#64748B;">Resolution</div>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="margin-top:20px;padding:14px;background:#F7FAFE;border:1px solid #DCE6F2;border-radius:10px;">
                <div style="font-size:14px;color:#0B2C4D;font-weight:700;margin-bottom:8px;">Note</div>
                <div style="font-size:13px;color:#4B5D72;line-height:1.6;">
                  Le rapport PDF detaille avec l'analyse IA est disponible dans le systeme.
                  Connectez-vous au dashboard pour le telecharger.
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#082038;color:#C9D7E7;text-align:center;padding:14px 18px;font-size:12px;line-height:1.5;">
              Cet email est automatique, merci de ne pas repondre.<br/>
              &copy; 2026 TAV - Tous droits reserves.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ── Schedule: every day at 23:00 ──
cron.schedule("0 23 * * *", () => {
  runDailyReport().catch((err) => {
    console.error("[CRON][Report] Unhandled error:", err);
  });
});

console.log("[CRON][Report] Daily report scheduled at 23:00.");

module.exports = { runDailyReport };
