const { google } = require("googleapis");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getOAuth2Client = () => {
  const clientId = String(process.env.GMAIL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.GMAIL_REFRESH_TOKEN || "").trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuth2 incomplet (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN).");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
};

const getGmailClient = () => {
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  if (!smtpUser) {
    throw new Error("SMTP_USER manquant.");
  }

  const oauth2Client = getOAuth2Client();
  return google.gmail({ version: "v1", auth: oauth2Client });
};

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

async function sendEmailGmailAPI(to, subject, html) {
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  const toEmail = normalizeEmail(to);
  const gmail = getGmailClient();

  try {
    const message = [
      `From: ${from}`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\n");

    const raw = toBase64Url(message);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    console.log("[EMAIL API] sent via Gmail API", { to: toEmail, subject });
  } catch (error) {
    console.error("[EMAIL API] send failure:", {
      to: toEmail,
      subject,
      message: error?.message || "",
      code: error?.code || "",
      responseCode: error?.responseCode || "",
    });
    throw error;
  }
}

const buildOtpHtml = ({ code, expiresMinutes = 5 }) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 22px rgba(0,0,0,.08);">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(90deg,#0ea5e9,#2563eb);color:#fff;">
                <div style="font-size:18px;font-weight:700;">Code de verification</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="font-size:14px;line-height:1.7;">Utilisez ce code pour poursuivre votre connexion :</div>
                <div style="margin-top:18px;font-size:34px;font-weight:800;letter-spacing:6px;color:#0f172a;">${code}</div>
                <div style="margin-top:14px;color:#dc2626;font-size:13px;">Expire dans ${expiresMinutes} minutes.</div>
                <div style="margin-top:18px;font-size:12px;color:#6b7280;">TAV Airports System</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const buildConfirmHtml = ({ confirmUrl, denyUrl, details }) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 22px rgba(0,0,0,.08);">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(90deg,#0ea5e9,#2563eb);color:#fff;">
                <div style="font-size:18px;font-weight:700;">Confirmation de connexion</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="font-size:14px;line-height:1.7;">Nouvelle tentative de connexion detectee.</div>
                <div style="margin-top:12px;padding:12px;background:#f3f4f6;border-radius:10px;font-size:13px;line-height:1.6;">
                  <div><b>Heure:</b> ${details?.time || "-"}</div>
                  <div><b>Appareil:</b> ${details?.deviceLabel || "-"}</div>
                  <div><b>IP:</b> ${details?.ip || "-"}</div>
                  <div><b>Lieu:</b> ${details?.location || "-"}</div>
                </div>
                <div style="margin-top:18px;">
                  <a href="${confirmUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;">
                    C'est moi
                  </a>
                  <a href="${denyUrl || "#"}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;margin-left:10px;">
                    Ce n'est pas moi
                  </a>
                </div>
                <div style="margin-top:18px;font-size:12px;color:#6b7280;">TAV Airports System</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const sendOtpEmail = async ({ to, code, purpose = "otp", expiresMinutes = 5 }) => {
  const subject =
    purpose === "forgot-password" ? "Code de verification - Reinitialisation" : "Code de verification";
  const html = buildOtpHtml({ code, expiresMinutes });
  return sendEmailGmailAPI(to, subject, html);
};

const sendLoginConfirmationEmail = async ({ to, confirmUrl, denyUrl, details }) => {
  const html = buildConfirmHtml({ confirmUrl, denyUrl, details });
  return sendEmailGmailAPI(to, "Confirmez votre connexion", html);
};

module.exports = {
  sendEmail: sendEmailGmailAPI,
  sendEmailGmailAPI,
  sendOtpEmail,
  sendLoginConfirmationEmail,
};
