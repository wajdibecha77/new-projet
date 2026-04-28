const nodemailer = require("nodemailer");
const axios = require("axios");

// ================= HELPERS =================
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const cleanEnvValue = (value) => String(value || "").trim().replace(/^['\"]|['\"]$/g, "");
const cleanAppPassword = (value) => cleanEnvValue(value).replace(/\s+/g, "");
const cleanTokenValue = (value) => cleanEnvValue(value).replace(/\s+/g, "");
const escapeHtml = (value) =>
  String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const smtpUser = normalizeEmail(cleanEnvValue(process.env.SMTP_USER));
const smtpPass = cleanAppPassword(process.env.SMTP_PASS);
const smtpHost = cleanEnvValue(process.env.SMTP_HOST || "smtp.gmail.com");
const smtpPort = Number(cleanEnvValue(process.env.SMTP_PORT || "587")) || 587;
const smtpSecure = String(process.env.SMTP_SECURE || "false").trim().toLowerCase() === "true";
const smtpFallbackEnabled = String(process.env.SMTP_FALLBACK_ENABLED || "true").trim().toLowerCase() === "true";
const resendApiKey = cleanEnvValue(process.env.RESEND_API_KEY);
const resendFrom = cleanEnvValue(process.env.RESEND_FROM || process.env.SMTP_FROM || smtpUser);
const resendMaxRetries = Number(cleanEnvValue(process.env.RESEND_MAX_RETRIES || "3")) || 3;
const resendRetryBaseMs = Number(cleanEnvValue(process.env.RESEND_RETRY_BASE_MS || "700")) || 700;
const gmailApiClientId = cleanEnvValue(process.env.GMAIL_API_CLIENT_ID);
const gmailApiClientSecret = cleanEnvValue(process.env.GMAIL_API_CLIENT_SECRET);
const gmailApiRefreshToken = cleanTokenValue(process.env.GMAIL_API_REFRESH_TOKEN);
const gmailApiUser = normalizeEmail(cleanEnvValue(process.env.GMAIL_API_USER || smtpUser));
const gmailApiFrom = cleanEnvValue(process.env.GMAIL_API_FROM || process.env.SMTP_FROM || gmailApiUser);
const gmailApiMaxRetries = Number(cleanEnvValue(process.env.GMAIL_API_MAX_RETRIES || "3")) || 3;
const gmailApiRetryBaseMs = Number(cleanEnvValue(process.env.GMAIL_API_RETRY_BASE_MS || "700")) || 700;
const isRailwayRuntime = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
const emailProvider = cleanEnvValue(
  process.env.EMAIL_PROVIDER ||
    (
      isRailwayRuntime && gmailApiClientId && gmailApiClientSecret && gmailApiRefreshToken
        ? "gmail_api"
        : (isRailwayRuntime && resendApiKey ? "resend" : "auto")
    )
).toLowerCase();

if (!smtpUser) {
  console.warn("[EMAIL] SMTP_USER is missing in .env");
}

if (!smtpPass) {
  console.warn("[EMAIL] SMTP_PASS is missing in .env");
}

if (emailProvider === "gmail_api") {
  if (!gmailApiClientId) console.warn("[EMAIL] GMAIL_API_CLIENT_ID is missing in .env");
  if (!gmailApiClientSecret) console.warn("[EMAIL] GMAIL_API_CLIENT_SECRET is missing in .env");
  if (!gmailApiRefreshToken) console.warn("[EMAIL] GMAIL_API_REFRESH_TOKEN is missing in .env");
  if (!gmailApiUser) console.warn("[EMAIL] GMAIL_API_USER is missing in .env");
}

// ================= TRANSPORTER =================
const createSmtpTransporter = ({ host, port, secure }) =>
  nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

const transporter = createSmtpTransporter({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
});

const fallbackPort = smtpPort === 587 ? 465 : 587;
const fallbackSecure = fallbackPort === 465;
const fallbackTransporter = createSmtpTransporter({
  host: smtpHost,
  port: fallbackPort,
  secure: fallbackSecure,
});

const isConnectionError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    ["ETIMEDOUT", "ESOCKET", "ECONNECTION", "ECONNRESET", "EHOSTUNREACH", "ENOTFOUND"].includes(code) ||
    /timed out|timeout|greeting never received|connection closed|connect/.test(message)
  );
};

const canUseResendApi = () => !!resendApiKey;
const canUseGmailApi =
  () => !!(gmailApiClientId && gmailApiClientSecret && gmailApiRefreshToken && gmailApiUser);

const stripHtml = (html) =>
  String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const extractEmailFromFromHeader = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/<([^<>]+)>/);
  if (match && match[1]) return String(match[1]).trim();
  return raw;
};

const isValidEmailAddress = (value) => simpleEmailRegex.test(String(value || "").trim());

const isRetryableResendError = (error) => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  const noResponse = !error?.response;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  if (["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(code)) return true;
  return noResponse;
};

const isRetryableGmailError = (error) => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  if (["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(code)) return true;
  return /timeout|temporar|try again|rate limit|network/i.test(message);
};

const getProviderRetryDelay = (provider, error, attemptIndex) => {
  const base = provider === "gmail_api" ? gmailApiRetryBaseMs : resendRetryBaseMs;
  const retryAfterMs = Number(error?.response?.headers?.["retry-after"] || 0) * 1000;
  if (retryAfterMs > 0) return retryAfterMs;
  return base * Math.pow(2, attemptIndex);
};

const encodeHeaderUtf8 = (value) => `=?UTF-8?B?${Buffer.from(String(value || ""), "utf8").toString("base64")}?=`;

const toBase64MimeLines = (value) =>
  Buffer.from(String(value || ""), "utf8")
    .toString("base64")
    .replace(/(.{1,76})/g, "$1\r\n")
    .trim();

const toBase64Url = (value) =>
  Buffer.from(String(value || ""), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const buildGmailRawMessage = ({ from, to, subject, html }) => {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const text = stripHtml(html);
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUtf8(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=\"UTF-8\"",
    "Content-Transfer-Encoding: base64",
    "",
    toBase64MimeLines(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=\"UTF-8\"",
    "Content-Transfer-Encoding: base64",
    "",
    toBase64MimeLines(html),
    `--${boundary}--`,
    "",
  ];
  return toBase64Url(lines.join("\r\n"));
};

let gmailTokenCache = { accessToken: "", expiresAtMs: 0 };

const getGmailAccessToken = async () => {
  const now = Date.now();
  if (gmailTokenCache.accessToken && gmailTokenCache.expiresAtMs > now + 30000) {
    return gmailTokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: gmailApiClientId,
    client_secret: gmailApiClientSecret,
    refresh_token: gmailApiRefreshToken,
    grant_type: "refresh_token",
  });

  const response = await axios.post(
    "https://oauth2.googleapis.com/token",
    body.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    }
  );

  const accessToken = String(response?.data?.access_token || "");
  const expiresInSec = Number(response?.data?.expires_in || 3600);
  if (!accessToken) {
    throw new Error("Gmail API token response missing access_token");
  }

  gmailTokenCache = {
    accessToken,
    expiresAtMs: now + expiresInSec * 1000,
  };

  return accessToken;
};

const sendWithResendApi = async ({ from, to, subject, html }) => {
  if (!canUseResendApi()) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const fromAddress = String(resendFrom || from || "").trim();
  if (!fromAddress || !isValidEmailAddress(extractEmailFromFromHeader(fromAddress))) {
    throw new Error(
      "RESEND_FROM invalide. Exemple: onboarding@resend.dev ou Admin TAV <onboarding@resend.dev>"
    );
  }

  const payload = {
    from: fromAddress,
    to: [String(to || "").trim()],
    subject: String(subject || "").trim(),
    html: String(html || ""),
    text: stripHtml(html),
  };

  let lastError;
  for (let i = 0; i < resendMaxRetries; i += 1) {
    try {
      const response = await axios.post(
        "https://api.resend.com/emails",
        payload,
        {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      return {
        messageId: response?.data?.id,
        accepted: [to],
        rejected: [],
        provider: "resend",
      };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableResendError(error);
      const attemptLabel = `${i + 1}/${resendMaxRetries}`;
      console.error(`[EMAIL][RESEND] attempt ${attemptLabel} failed:`, error?.message || error);
      if (!retryable || i === resendMaxRetries - 1) break;
      const delayMs = getProviderRetryDelay("resend", error, i);
      await sleep(delayMs);
    }
  }

  throw lastError;
};

const sendWithGmailApi = async ({ from, to, subject, html }) => {
  if (!canUseGmailApi()) {
    throw new Error(
      "Gmail API is not configured. Required: GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET, GMAIL_API_REFRESH_TOKEN, GMAIL_API_USER."
    );
  }

  const toEmail = String(to || "").trim();
  const fromAddress = String(from || gmailApiFrom || gmailApiUser).trim();
  if (!toEmail || !isValidEmailAddress(toEmail)) {
    throw new Error("Invalid recipient email for Gmail API");
  }
  if (!fromAddress || !isValidEmailAddress(extractEmailFromFromHeader(fromAddress))) {
    throw new Error(
      "GMAIL_API_FROM invalide. Exemple: projetadm60@gmail.com ou Admin TAV <projetadm60@gmail.com>"
    );
  }

  const raw = buildGmailRawMessage({
    from: fromAddress,
    to: toEmail,
    subject: String(subject || "").trim(),
    html: String(html || ""),
  });

  let lastError;
  for (let i = 0; i < gmailApiMaxRetries; i += 1) {
    try {
      const accessToken = await getGmailAccessToken();
      const response = await axios.post(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        { raw },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      return {
        messageId: response?.data?.id || null,
        accepted: [toEmail],
        rejected: [],
        provider: "gmail_api",
      };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableGmailError(error);
      const attemptLabel = `${i + 1}/${gmailApiMaxRetries}`;
      console.error(`[EMAIL][GMAIL_API] attempt ${attemptLabel} failed:`, error?.message || error);
      if (!retryable || i === gmailApiMaxRetries - 1) break;
      const delayMs = getProviderRetryDelay("gmail_api", error, i);
      await sleep(delayMs);
    }
  }

  throw lastError;
};

const sendMailWithFailover = async (mailOptions) => {
  if (emailProvider === "gmail_api") {
    try {
      return await sendWithGmailApi(mailOptions);
    } catch (gmailError) {
      if (!isRetryableGmailError(gmailError)) {
        throw gmailError;
      }

      // Retryable Gmail API errors can fallback to RESEND (if configured) or SMTP.
      if (canUseResendApi()) {
        console.warn("[EMAIL] Gmail API retryable failure. Falling back to RESEND API.");
        try {
          return await sendWithResendApi(mailOptions);
        } catch (resendError) {
          // continue to SMTP fallback below
          console.warn("[EMAIL] RESEND fallback also failed after Gmail API failure.");
          if (!smtpFallbackEnabled) throw resendError;
        }
      }

      try {
        return await transporter.sendMail(mailOptions);
      } catch (smtpPrimaryError) {
        if (smtpFallbackEnabled && isConnectionError(smtpPrimaryError)) {
          return fallbackTransporter.sendMail(mailOptions);
        }
        throw smtpPrimaryError;
      }
    }
  }

  if (emailProvider === "resend" && canUseResendApi()) {
    try {
      return await sendWithResendApi(mailOptions);
    } catch (resendError) {
      if (!isRetryableResendError(resendError)) {
        throw resendError;
      }
      console.warn("[EMAIL] RESEND primary failed with retryable error, retrying SMTP fallback.");
      try {
        return await transporter.sendMail(mailOptions);
      } catch (smtpPrimaryError) {
        if (smtpFallbackEnabled && isConnectionError(smtpPrimaryError)) {
          return fallbackTransporter.sendMail(mailOptions);
        }
        throw smtpPrimaryError;
      }
    }
  }

  // Railway Free/Trial/Hobby often blocks outbound SMTP.
  // If RESEND_API_KEY is configured and SMTP is unreachable, fallback to HTTPS API.
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    const primaryFailedWithConnectionError = isConnectionError(error);

    if (smtpFallbackEnabled && primaryFailedWithConnectionError) {
      try {
        console.warn(
          `[EMAIL] Primary SMTP failed on ${smtpHost}:${smtpPort} (secure=${smtpSecure}). Retrying with ${smtpHost}:${fallbackPort} (secure=${fallbackSecure}).`
        );
        return await fallbackTransporter.sendMail(mailOptions);
      } catch (fallbackError) {
        if (canUseResendApi() && isConnectionError(fallbackError)) {
          console.warn("[EMAIL] SMTP unreachable on Railway. Falling back to RESEND API (HTTPS).");
          return sendWithResendApi(mailOptions);
        }
        throw fallbackError;
      }
    }

    if (canUseResendApi() && primaryFailedWithConnectionError) {
      console.warn("[EMAIL] SMTP unreachable on Railway. Falling back to RESEND API (HTTPS).");
      return sendWithResendApi(mailOptions);
    }

    throw error;
  }
};

// ================= VERIFY CONNECTION =================
if (emailProvider === "smtp" || emailProvider === "auto") {
  transporter.verify((err) => {
    if (err) {
      const msg = String(err?.message || err || "");
      console.error(`SMTP ERROR (${smtpHost}:${smtpPort}, secure=${smtpSecure}):`, err);
      if (/Invalid login|BadCredentials|Username and Password not accepted/i.test(msg)) {
        console.error(
          "SMTP AUTH HELP: Verify SMTP_USER + 16-char Gmail App Password, enable 2-Step Verification, and generate a new App Password if needed."
        );
      }
    } else {
      console.log(`SMTP READY (${smtpHost}:${smtpPort}, secure=${smtpSecure})`);
    }
  });
} else if (emailProvider === "resend") {
  console.log("[EMAIL] Provider mode: RESEND primary (SMTP fallback enabled).");
} else if (emailProvider === "gmail_api") {
  console.log("[EMAIL] Provider mode: GMAIL API primary (HTTPS).");
} else {
  console.warn(`[EMAIL] Unknown EMAIL_PROVIDER='${emailProvider}', using auto failover behavior.`);
}

// ================= GENERIC EMAIL =================
async function sendEmail(to, subject, html) {
  const from =
    emailProvider === "gmail_api"
      ? (String(gmailApiFrom || gmailApiUser).trim() || gmailApiUser)
      : (emailProvider === "resend"
          ? (String(resendFrom || process.env.SMTP_FROM || smtpUser).trim() || smtpUser)
          : (String(process.env.SMTP_FROM || smtpUser).trim() || smtpUser));
  const toEmail = normalizeEmail(to);

  if (!toEmail) {
    throw new Error("Recipient email is required");
  }

  return sendMailWithFailover({
    from,
    to: toEmail,
    subject,
    html,
  });
}

// ================= OTP EMAIL =================
const buildOtpHtml = ({ code, expiresMinutes = 5, purpose = "otp" }) => {
  const safeCode = escapeHtml(code);
  const safeMinutes = escapeHtml(expiresMinutes);
  const title =
    purpose === "forgot-password"
      ? "Code de reinitialisation"
      : "Code de verification";
  const description =
    purpose === "forgot-password"
      ? "Vous avez demande la reinitialisation de votre mot de passe."
      : "Vous avez demande un code de verification pour continuer.";

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      @media only screen and (max-width: 680px) {
        .container { width: 100% !important; border-radius: 0 !important; }
        .mobile-pad { padding-left: 18px !important; padding-right: 18px !important; }
        .header-col { display: block !important; width: 100% !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#EEF2F6;font-family:Arial,sans-serif;color:#16283B;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" class="container" cellpadding="0" cellspacing="0" border="0" style="width:680px;max-width:680px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(11,44,77,0.14);">
            <tr>
              <td style="background:#0B2C4D;padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="header-col" style="padding:22px 24px 18px 24px;color:#FFFFFF;vertical-align:middle;">
                      <div style="font-size:36px;font-weight:700;letter-spacing:1px;line-height:1;">TAV</div>
                      <div style="font-size:13px;opacity:0.9;padding-top:3px;letter-spacing:1px;">AIRPORTS</div>
                    </td>
                    <td class="header-col" align="right" style="padding:22px 24px 18px 10px;color:#DCE7F2;font-size:18px;line-height:1.35;font-weight:600;vertical-align:middle;">
                      Votre securite est notre priorite
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:#E53935;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>

            <tr>
              <td class="mobile-pad" align="center" style="padding:32px 34px 18px 34px;">
                <div style="width:70px;height:70px;line-height:70px;border-radius:50%;background:#EEF4FF;color:#0B2C4D;font-size:34px;text-align:center;margin:0 auto 14px auto;">&#128274;</div>
                <div style="font-size:42px;line-height:1.1;font-weight:700;color:#0B2C4D;margin-bottom:10px;">${title}</div>
                <div style="font-size:18px;line-height:1.6;color:#4B5D72;max-width:560px;">
                  ${description}<br/>Veuillez utiliser le code ci-dessous pour valider votre action.
                </div>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:0 34px 8px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:22px 16px;">
                      <div style="font-size:60px;line-height:1;letter-spacing:14px;font-weight:700;color:#0B2C4D;">${safeCode}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:14px 34px 10px 34px;text-align:center;color:#4D5F75;font-size:20px;line-height:1.5;">
                Ce code expirera dans <span style="color:#E53935;font-weight:700;">${safeMinutes} minutes</span>.
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:6px 34px 26px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 14px;color:#425B73;font-size:15px;line-height:1.6;">
                      <b style="color:#0B2C4D;">Securite:</b> Ne partagez jamais ce code avec qui que ce soit. L'equipe TAV ne vous demandera jamais ce code.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#0B2C4D;padding:24px 26px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="color:#FFFFFF;vertical-align:top;padding-bottom:12px;padding-right:10px;">
                      <div style="font-size:30px;font-weight:700;letter-spacing:1px;line-height:1;">TAV</div>
                      <div style="font-size:14px;opacity:0.95;line-height:1.6;padding-top:8px;">Service de securite et de notification corporate.</div>
                    </td>
                    <td style="color:#DCE7F2;vertical-align:top;padding-bottom:12px;padding-right:10px;">
                      <div style="font-size:18px;font-weight:700;color:#FFFFFF;padding-bottom:6px;">Nous contacter</div>
                      <div style="font-size:14px;line-height:1.7;">
                        Tel: +216 70 054 000<br/>
                        Email: contact@tav.tn<br/>
                        Site: www.tav.tn
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#082038;color:#C9D7E7;text-align:center;padding:14px 18px;font-size:13px;line-height:1.5;">
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
};

const sendOtpEmail = async ({ to, code, purpose = "otp", expiresMinutes = 5 }) => {
  const subject =
    purpose === "forgot-password"
      ? "Reinitialisation du mot de passe"
      : "Code de verification";

  const html = buildOtpHtml({ code, expiresMinutes, purpose });
  return sendEmail(to, subject, html);
};

// ================= LOGIN CONFIRM =================
const buildConfirmHtml = ({ confirmUrl, denyUrl, details }) => {
  const safeTime = escapeHtml(details?.time || "-");
  const safeDevice = escapeHtml(details?.deviceLabel || "-");
  const safeLocation = escapeHtml(details?.location || "-");
  const safeIp = escapeHtml(details?.ip || "-");
  const safeConfirmUrl = escapeHtml(confirmUrl || "#");
  const safeDenyUrl = escapeHtml(denyUrl || "#");

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notification de connexion</title>
    <style>
      .btn-green:hover { background:#18853f !important; }
      .btn-red:hover { background:#c92f2b !important; }
      @media only screen and (max-width: 680px) {
        .container { width:100% !important; border-radius:0 !important; }
        .mobile-pad { padding-left:18px !important; padding-right:18px !important; }
        .stack, .header-left, .header-right, .info-col, .btn-col, .footer-col {
          display:block !important;
          width:100% !important;
          text-align:left !important;
        }
        .header-right { padding-top:6px !important; }
        .btn-col { padding-bottom:12px !important; padding-left:0 !important; padding-right:0 !important; }
        .btn-col:last-child { padding-bottom:0 !important; }
        .info-col { padding-left:0 !important; padding-right:0 !important; padding-bottom:12px !important; }
        .info-col:last-child { padding-bottom:0 !important; }
        .hero-title { font-size:34px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#EEF2F6;font-family:Arial,sans-serif;color:#16283B;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="680" cellpadding="0" cellspacing="0" border="0" style="width:680px;max-width:680px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(11,44,77,0.15);">
            <tr>
              <td style="background:#0B2C4D;padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="header-left" style="padding:22px 24px 18px 24px;color:#FFFFFF;vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="font-size:36px;font-weight:700;letter-spacing:1px;line-height:1;">TAV</td>
                        </tr>
                        <tr>
                          <td style="font-size:13px;opacity:0.9;padding-top:3px;letter-spacing:1px;">AIRPORTS</td>
                        </tr>
                      </table>
                    </td>
                    <td class="header-right" align="right" style="padding:22px 24px 18px 10px;color:#DCE7F2;font-size:18px;line-height:1.35;font-weight:600;vertical-align:middle;">
                      Votre securite est notre priorite
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:#E53935;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>

            <tr>
              <td class="mobile-pad" align="center" style="padding:34px 34px 14px 34px;">
                <div style="width:72px;height:72px;line-height:72px;border-radius:50%;background:#FDEDEE;color:#E53935;font-size:36px;text-align:center;margin:0 auto 14px auto;">&#9888;</div>
                <div class="hero-title" style="font-size:42px;line-height:1.1;font-weight:700;color:#0B2C4D;margin-bottom:10px;">Nouvelle connexion detectee</div>
                <div style="font-size:18px;line-height:1.6;color:#4B5D72;max-width:560px;">
                  Nous avons detecte une tentative de connexion a votre compte.
                </div>
                <div style="width:86px;height:3px;background:#E53935;border-radius:2px;margin:18px auto 0 auto;"></div>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:22px 34px 8px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7FAFE;border:1px solid #DCE6F2;border-radius:14px;">
                  <tr>
                    <td class="info-col" width="50%" style="padding:16px 12px 10px 16px;vertical-align:top;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom:10px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E3EBF5;border-radius:10px;">
                              <tr>
                                <td style="padding:10px 12px;font-size:14px;color:#60748A;">&#9200; Heure</td>
                              </tr>
                              <tr>
                                <td style="padding:0 12px 11px 12px;font-size:17px;color:#0B2C4D;font-weight:700;">${safeTime}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E3EBF5;border-radius:10px;">
                              <tr>
                                <td style="padding:10px 12px;font-size:14px;color:#60748A;">&#128187; Appareil</td>
                              </tr>
                              <tr>
                                <td style="padding:0 12px 11px 12px;font-size:17px;color:#0B2C4D;font-weight:700;">${safeDevice}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="info-col" width="50%" style="padding:16px 16px 10px 12px;vertical-align:top;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom:10px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E3EBF5;border-radius:10px;">
                              <tr>
                                <td style="padding:10px 12px;font-size:14px;color:#60748A;">&#127760; Lieu</td>
                              </tr>
                              <tr>
                                <td style="padding:0 12px 11px 12px;font-size:17px;color:#0B2C4D;font-weight:700;">${safeLocation}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E3EBF5;border-radius:10px;">
                              <tr>
                                <td style="padding:10px 12px;font-size:14px;color:#60748A;">&#128225; Adresse IP</td>
                              </tr>
                              <tr>
                                <td style="padding:0 12px 11px 12px;font-size:17px;color:#0B2C4D;font-weight:700;">${safeIp}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:18px 34px 8px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="btn-col" width="50%" style="padding-right:8px;vertical-align:top;">
                      <a href="${safeConfirmUrl}" class="btn-green" style="display:block;background:#1F9D4C;color:#FFFFFF;text-decoration:none;border-radius:12px;padding:16px 12px;text-align:center;font-size:22px;font-weight:700;box-shadow:0 6px 14px rgba(31,157,76,0.25);">
                        C'est moi
                      </a>
                      <div style="text-align:center;color:#4C647A;font-size:14px;padding-top:7px;">Confirmer cette connexion</div>
                    </td>
                    <td class="btn-col" width="50%" style="padding-left:8px;vertical-align:top;">
                      <a href="${safeDenyUrl}" class="btn-red" style="display:block;background:#E53935;color:#FFFFFF;text-decoration:none;border-radius:12px;padding:16px 12px;text-align:center;font-size:22px;font-weight:700;box-shadow:0 6px 14px rgba(229,57,53,0.25);">
                        Ce n'est pas moi
                      </a>
                      <div style="text-align:center;color:#4C647A;font-size:14px;padding-top:7px;">Securiser mon compte</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:8px 34px 26px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF8F8;border-left:4px solid #E53935;border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px;color:#4D5F75;font-size:14px;line-height:1.55;">
                      <span style="color:#E53935;font-weight:700;">Info securite:</span> Si vous ne repondez pas, cette connexion sera automatiquement refusee dans <b>15 minutes</b>.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#0B2C4D;padding:24px 26px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="footer-col" width="34%" style="color:#FFFFFF;vertical-align:top;padding-bottom:12px;padding-right:10px;">
                      <div style="font-size:30px;font-weight:700;letter-spacing:1px;line-height:1;">TAV</div>
                      <div style="font-size:14px;opacity:0.95;line-height:1.6;padding-top:8px;">Service de securite et de notification corporate.</div>
                    </td>
                    <td class="footer-col" width="33%" style="color:#DCE7F2;vertical-align:top;padding-bottom:12px;padding-right:10px;">
                      <div style="font-size:18px;font-weight:700;color:#FFFFFF;padding-bottom:6px;">Nous contacter</div>
                      <div style="font-size:14px;line-height:1.7;">
                        Tel: +216 70 054 000<br/>
                        Email: contact@tav.tn<br/>
                        Site: www.tav.tn
                      </div>
                    </td>
                    <td class="footer-col" width="33%" style="color:#DCE7F2;vertical-align:top;">
                      <div style="font-size:18px;font-weight:700;color:#FFFFFF;padding-bottom:6px;">Suivez-nous</div>
                      <div style="font-size:14px;line-height:1.9;">
                        LinkedIn<br/>
                        Facebook<br/>
                        YouTube
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#082038;color:#C9D7E7;text-align:center;padding:14px 18px;font-size:13px;line-height:1.5;">
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
};

const sendLoginConfirmationEmail = async ({ to, confirmUrl, denyUrl, details }) => {
  const html = buildConfirmHtml({ confirmUrl, denyUrl, details });
  return sendEmail(to, "Confirmation de connexion", html);
};

// ================= EXPORT =================
module.exports = {
  transporter,
  sendEmail,
  sendOtpEmail,
  sendLoginConfirmationEmail,
};
