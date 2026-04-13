const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const geoip = require("geoip-lite");
const jwt = require("jsonwebtoken");
const https = require("https");

const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const Notification = require("../models/Notification");
const LoginChallenge = require("../models/LoginChallenge");

const CODE_EXPIRE_MINUTES = 15;
const LOGIN_OTP_EXPIRE_MINUTES = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const randomToken = () => crypto.randomBytes(32).toString("hex");

const formatDateFR = (d) => new Date(d).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" });

const allowLoginOnSmtpFailure =
  String(process.env.ALLOW_LOGIN_ON_SMTP_FAILURE || "true").toLowerCase() === "true";
const runtimeVerifiedDevices = new Map();

// -------------------- helpers --------------------
const getVisiteurIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  let ip = (Array.isArray(xf) ? xf[0] : xf || "").split(",")[0].trim();
  ip = ip || req.socket?.remoteAddress || "";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip;
};

const getDeviceInfo = (req) => {
  const ua = String(req.body?.deviceInfo?.userAgent || req.headers["user-agent"] || "");
  const r = new UAParser(ua).getResult();

  const deviceType = r.device?.type || "desktop";
  const deviceVendor = r.device?.vendor || "";
  const deviceModel = r.device?.model || "";

  const browser = [r.browser?.name, r.browser?.version].filter(Boolean).join(" ");
  const os = [r.os?.name, r.os?.version].filter(Boolean).join(" ");

  return { ua, deviceType, deviceVendor, deviceModel, browser, os };
};

const getApproxLocationLabel = (ip) => {
  if (!ip) return "";
  const g = geoip.lookup(ip);
  if (!g) return "";
  const city = g.city || "";
  const country = g.country || "";
  return `${city ? city + ", " : ""}${country}`.trim();
};

const deviceHashFromReq = (req) => {
  const ua = String(req.body?.deviceInfo?.userAgent || req.headers["user-agent"] || "");
  const deviceId = String(req.body?.deviceInfo?.deviceId || "").trim();
  return sha256(`${deviceId || "unknown-device"}|${ua}`);
};

const runtimeVerificationKey = (userId, deviceHash) => `${String(userId)}:${String(deviceHash)}`;
const isVerifiedInCurrentRuntime = (userId, deviceHash) =>
  runtimeVerifiedDevices.has(runtimeVerificationKey(userId, deviceHash));
const markVerifiedInCurrentRuntime = (userId, deviceHash) => {
  runtimeVerifiedDevices.set(runtimeVerificationKey(userId, deviceHash), {
    verifiedAt: new Date(),
  });
};

const smtpTransporter = () => {
  const smtpHost = String(process.env.SMTP_HOST || "").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const smtpSecure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true"
      ? true
      : smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("Configuration SMTP manquante (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  return { transporter, smtpFrom };
};

const throwSmtpCredentialError = (error) => {
  if (
    error?.responseCode === 535 ||
    String(error?.message || "").includes("BadCredentials")
  ) {
    throw new Error(
      "Identifiants SMTP invalides. Pour Gmail, activez la validation en 2 etapes et utilisez un App Password dans SMTP_PASS."
    );
  }
  throw error;
};

const signJwt = (user) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET manquant dans .env");

  return jwt.sign(
    { id: user._id, role: user.role || "USER" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ✅ Node14 reverse geocode via https (OpenStreetMap Nominatim)
const reverseGeocodeOSM = (lat, lng) =>
  new Promise((resolve) => {
    if (lat == null || lng == null) return resolve("");

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1`;

    const req = https.get(
      url,
      {
        headers: {
          // لازم User-Agent في Nominatim
          "User-Agent": "PFE-App/1.0 (contact: moatezguez1@gmail.com)",
          "Accept-Language": "fr",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const a = json?.address || {};
            const city = a.city || a.town || a.village || a.municipality || "";
            const state = a.state || "";
            const country = a.country || "";

            const label = [city, state, country].filter(Boolean).join(", ").trim();
            return resolve(label || "");
          } catch {
            return resolve("");
          }
        });
      }
    );

    req.on("error", () => resolve(""));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve("");
    });
  });

// -------------------- emails --------------------
const sendResetCodeEmail = async (toEmail, code) => {
  const { transporter, smtpFrom } = smtpTransporter();
  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: "Code de réinitialisation du mot de passe",
      text:
        "Bonjour,\n\n" +
        "Votre code de réinitialisation est : " +
        code +
        "\n\n" +
        "Ce code expire dans " +
        CODE_EXPIRE_MINUTES +
        " minutes.\n",
    });
  } catch (error) {
    throwSmtpCredentialError(error);
  }
};

const sendLoginOtpEmail = async (toEmail, code) => {
  const { transporter, smtpFrom } = smtpTransporter();
  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: "Code de sécurité (connexion)",
      text:
        "Bonjour,\n\n" +
        "Votre code de sécurité est : " +
        code +
        "\n\n" +
        "Ce code expire dans " +
        LOGIN_OTP_EXPIRE_MINUTES +
        " minutes.\n",
    });
  } catch (error) {
    throwSmtpCredentialError(error);
  }
};

const sendNewLoginAlertEmail = async ({ toEmail, approveUrl, denyUrl, details }) => {
  const { transporter, smtpFrom } = smtpTransporter();

  const html = `
  <!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 22px rgba(0,0,0,.08);">
              <tr>
                <td style="padding:22px 24px;background:linear-gradient(90deg,#0ea5e9,#2563eb);color:#fff;">
                  <div style="font-size:18px;font-weight:700;">Vérification de connexion</div>
                  <div style="opacity:.95;margin-top:6px;">Nouvelle tentative de connexion détectée</div>
                </td>
              </tr>

              <tr>
                <td style="padding:22px 24px;">
                  <div style="font-size:14px;line-height:1.6;">
                    Bonjour,<br/>
                    Nous avons détecté une tentative de connexion à votre compte. Confirmez si c’est bien vous.
                  </div>

                  <div style="margin-top:16px;padding:14px;background:#f3f4f6;border-radius:12px;font-size:13px;line-height:1.6;">
                    <div><b>Heure :</b> ${details.time}</div>
                    <div><b>Appareil :</b> ${details.deviceLabel}</div>
                    <div><b>Système :</b> ${details.os || "Inconnu"}</div>
                    <div><b>Navigateur :</b> ${details.browser || "Inconnu"}</div>
                    <div><b>IP :</b> ${details.ip || "Inconnue"}</div>

                    <div>
                      <b>Lieu :</b> ${details.location || "Inconnu"}
                      ${details.mapsUrl
      ? ` — <a href="${details.mapsUrl}" style="color:#2563eb;text-decoration:none;font-weight:700;">Voir sur Google Maps</a>`
      : ""
    }
                    </div>
                  </div>

                  <div style="margin-top:18px;">
                    <a href="${approveUrl}"
                      style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;
                              padding:12px 16px;border-radius:12px;font-weight:700;font-size:14px;">
                      ✅ C’est moi
                    </a>

                    <a href="${denyUrl}"
                      style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;
                              padding:12px 16px;border-radius:12px;font-weight:700;font-size:14px;margin-left:10px;">
                      ❌ Ce n’est pas moi
                    </a>
                  </div>

                  <div style="margin-top:18px;font-size:12px;color:#6b7280;line-height:1.6;">
                    Si ce n’est pas vous, refusez la connexion et changez votre mot de passe immédiatement.
                  </div>

                  <div style="margin-top:18px;font-size:11px;color:#9ca3af;">
                    © ${new Date().getFullYear()} — Sécurité & confidentialité
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  await transporter.sendMail({
    from: smtpFrom,
    to: toEmail,
    subject: "Nouvelle tentative de connexion — Confirmation requise",
    html,
    text:
      `Nouvelle tentative de connexion.\n` +
      `Heure: ${details.time}\n` +
      `Appareil: ${details.deviceLabel}\n` +
      `OS: ${details.os}\n` +
      `Navigateur: ${details.browser}\n` +
      `IP: ${details.ip}\n` +
      `Lieu: ${details.location}\n` +
      (details.mapsUrl ? `Google Maps: ${details.mapsUrl}\n` : "") +
      `\nC’est moi: ${approveUrl}\n` +
      `Ce n’est pas moi: ${denyUrl}\n`,
  });
};

// -------------------- controllers --------------------
module.exports = {

  signup: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Champs obligatoires",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 🔥 check if user exists
      const existing = await User.findOne({
        email: new RegExp("^" + normalizedEmail + "$", "i"),
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email déjà utilisé",
        });
      }

      // 🔥 hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 🔥 create user
      const user = new User({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "VISITEUR",
      });

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Compte créé avec succès",
      });

    } catch (error) {
      console.error("SIGNUP ERROR 👉", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  },


  // ===================== FORGOT PASSWORD =====================
  forgotPassword: async (req, res) => {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) return res.status(400).json({ success: false, message: "Email requis." });

    try {
      const user = await User.findOne({
        email: { $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i") },
      });

      if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable pour cet email." });

      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60 * 1000);

      await PasswordResetToken.updateMany({ email: normalizedEmail, used: false }, { $set: { used: true } });
      await PasswordResetToken.create({ email: normalizedEmail, code, expiresAt, used: false });

      await sendResetCodeEmail(normalizeEmail(user.email), code);

      await Notification.create({
        userId: user._id,
        title: "Réinitialisation mot de passe",
        message: "Demande reçue pour : " + normalizedEmail,
        type: "warning",
        isRead: false,
        createdAt: Date.now(),
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur lors de la demande." });
    }
  },

  verifyResetCode: async (req, res) => {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const normalizedCode = String(req.body?.code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      return res.status(400).json({ success: false, message: "Email et code sont requis." });
    }

    try {
      const tokenDoc = await PasswordResetToken.findOne({
        email: normalizedEmail,
        code: normalizedCode,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!tokenDoc) return res.status(400).json({ success: false, message: "Code invalide, déjà utilisé, ou expiré." });

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur vérification." });
    }
  },

  resetPassword: async (req, res) => {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const normalizedCode = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!normalizedEmail || !normalizedCode || !newPassword) {
      return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
    }

    try {
      const tokenDoc = await PasswordResetToken.findOne({
        email: normalizedEmail,
        code: normalizedCode,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!tokenDoc) return res.status(400).json({ success: false, message: "Code invalide, déjà utilisé, ou expiré." });

      const user = await User.findOne({
        email: { $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i") },
      });

      if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

      const hash = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(user._id, { password: hash }, { new: true });
      await PasswordResetToken.findByIdAndUpdate(tokenDoc._id, { used: true }, { new: true });

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur réinitialisation." });
    }
  },

  // ===================== LOGIN SECURE =====================
  loginSecure: async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email et mot de passe requis." });
    }

    try {
      const user = await User.findOne({ email: new RegExp("^" + escapeRegex(email) + "$", "i") });
      if (!user) return res.status(401).json({ success: false, message: "Identifiants invalides." });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ success: false, message: "Identifiants invalides." });

      // CLIENT bypass: connexion directe sans OTP/challenge email.
      // IMPORTANT: les autres roles conservent exactement le flux OTP actuel.
      if (String(user.role || "").toUpperCase() === "CLIENT") {
        const token = signJwt(user);
        return res.status(200).json({
          success: true,
          challengeRequired: false,
          token,
          user,
        });
      }

      const ip = getVisiteurIp(req);
      const dev = getDeviceInfo(req);
      const deviceHash = deviceHashFromReq(req);
      const deviceId = String(req.body?.deviceInfo?.deviceId || "").trim();

      const coords = req.body?.coords;

      // fallback geoip
      let locationLabel = getApproxLocationLabel(ip);
      let mapsUrl = "";

      // ✅ If GPS provided -> City/Country via OSM reverse
      if (coords?.lat && coords?.lng) {
        mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;

        const place = await reverseGeocodeOSM(coords.lat, coords.lng);
        locationLabel =
          place ||
          `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}${coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : ""
          }`;
      }

      const verifiedInRuntime = isVerifiedInCurrentRuntime(user._id, deviceHash);
      if (verifiedInRuntime) {
        const token = signJwt(user);
        return res.status(200).json({
          success: true,
          challengeRequired: false,
          verifiedInRuntime: true,
          token,
          user,
        });
      }

      const approveToken = randomToken();
      const denyToken = randomToken();

      const challenge = await LoginChallenge.create({
        userId: user._id,
        email,
        deviceId,
        deviceHash,
        userAgent: dev.ua,
        ip,
        location: locationLabel,

        deviceType: dev.deviceType,
        deviceVendor: dev.deviceVendor,
        deviceModel: dev.deviceModel,
        os: dev.os,
        browser: dev.browser,

        approveTokenHash: sha256(approveToken),
        denyTokenHash: sha256(denyToken),
        attempts: 0,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        status: "PENDING",
      });

      const apiBase = process.env.API_PUBLIC_URL || "http://localhost:5000";
      const approveUrl = `${apiBase}/auth/challenge/approve?cid=${challenge._id}&token=${approveToken}`;
      const denyUrl = `${apiBase}/auth/challenge/deny?cid=${challenge._id}&token=${denyToken}`;

      const deviceLabel =
        `${dev.deviceType} ${dev.deviceVendor} ${dev.deviceModel}`.trim() || dev.deviceType || "Inconnu";

      try {
        await sendNewLoginAlertEmail({
          toEmail: email,
          approveUrl,
          denyUrl,
          details: {
            time: formatDateFR(new Date()),
            ip,
            location: locationLabel || "Inconnu",
            mapsUrl,
            deviceLabel,
            os: dev.os || "Inconnu",
            browser: dev.browser || "Inconnu",
          },
        });
      } catch (mailError) {
        console.error("SMTP login alert failed:", mailError?.message || mailError);
        if (!allowLoginOnSmtpFailure) {
          throw mailError;
        }
        // ALLOW_LOGIN_ON_SMTP_FAILURE=true → on continue sans email
      }

      return res.status(200).json({
        success: true,
        challengeRequired: true,
        verifiedInRuntime: false,
        challengeId: String(challenge._id),
        message: "Vérification de connexion requise. Un e-mail vous a été envoyé.",
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur login." });
    }
  },

  approveChallenge: async (req, res) => {
    const cid = String(req.query?.cid || "");
    const token = String(req.query?.token || "");
    if (!cid || !token) return res.status(400).send("Lien invalide.");

    try {
      const challenge = await LoginChallenge.findOne({
        _id: cid,
        approveTokenHash: sha256(token),
        expiresAt: { $gt: new Date() },
        status: "PENDING",
      });

      if (!challenge) return res.status(400).send("Lien expiré ou invalide.");

      const otp = generateCode();

      challenge.status = "APPROVED";
      challenge.otpHash = await bcrypt.hash(otp, 10);
      challenge.attempts = 0;
      challenge.expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRE_MINUTES * 60 * 1000);
      await challenge.save();

      await sendLoginOtpEmail(challenge.email, otp);

      const appUrl = process.env.APP_PUBLIC_URL || "http://localhost:4200";
      return res.redirect(`${appUrl}/auth/signin?waiting=1&challengeId=${encodeURIComponent(String(challenge._id))}`);
    } catch {
      return res.status(500).send("Erreur serveur");
    }
  },

  denyChallenge: async (req, res) => {
    const cid = String(req.query?.cid || "");
    const token = String(req.query?.token || "");
    if (!cid || !token) return res.status(400).send("Lien invalide.");

    try {
      const challenge = await LoginChallenge.findOne({
        _id: cid,
        denyTokenHash: sha256(token),
        expiresAt: { $gt: new Date() },
        status: "PENDING",
      });

      if (!challenge) return res.status(400).send("Lien expire ou invalide.");

      challenge.status = "DENIED";
      await challenge.save();

      const appUrl = process.env.APP_PUBLIC_URL || "http://localhost:4200";
      const forgotPasswordUrl =

        `${appUrl}/auth/forgot-password` +
        `?email=${encodeURIComponent(challenge.email)}` +
        `&securityAlert=1`;

      return res.redirect(forgotPasswordUrl);
    } catch {
      return res.status(500).send("Erreur serveur");
    }
  },

  verifyLoginOtp: async (req, res) => {
    const challengeId = String(req.body?.challengeId || "");
    const otp = String(req.body?.otp || "").trim();

    if (!challengeId || !otp) {
      return res.status(400).json({ success: false, message: "ChallengeId et code requis." });
    }

    try {
      const challenge = await LoginChallenge.findOne({
        _id: challengeId,
        status: "APPROVED",
        expiresAt: { $gt: new Date() },
      });

      if (!challenge || !challenge.otpHash) {
        return res.status(400).json({ success: false, message: "Code invalide ou expiré." });
      }

      if ((challenge.attempts || 0) >= 5) {
        return res.status(429).json({ success: false, message: "Trop de tentatives. Veuillez recommencer." });
      }

      const ok = await bcrypt.compare(otp, challenge.otpHash);
      if (!ok) {
        challenge.attempts = (challenge.attempts || 0) + 1;
        await challenge.save();
        return res.status(400).json({ success: false, message: "Code invalide." });
      }

      markVerifiedInCurrentRuntime(challenge.userId, challenge.deviceHash);

      challenge.status = "VERIFIED";
      await challenge.save();

      const user = await User.findById(challenge.userId);
      const token = signJwt(user);

      return res.status(200).json({ success: true, verifiedInRuntime: true, token, user });
    } catch {
      return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
  },
};

