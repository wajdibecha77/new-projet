const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const Notification = require("../models/Notification");
const LoginChallenge = require("../models/LoginChallenge");
const {
  sendOtpEmail,
  sendLoginConfirmationEmail: sendLoginConfirmationEmailByEmail,
} = require("../services/email.service");

const CODE_EXPIRE_MINUTES = 10;
const LOGIN_OTP_EXPIRE_MINUTES = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const TECHNICIAN_ROLES = ["TECHNICIEN", "INFORMATICIEN", "ELECTRICIEN", "MECANICIEN", "PLOMBERIE", "PLOMBIER"];
const isPrivilegedOtpRole = (role) =>
  ["ADMIN", ...TECHNICIAN_ROLES].includes(String(role || "").toUpperCase());

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const randomToken = () => crypto.randomBytes(32).toString("hex");

const formatDateFR = (d) => new Date(d).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" });

const runtimeVerifiedDevices = new Map();

// -------------------- helpers --------------------
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

const countryCodeToFlag = (countryCode) => {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
};

const isPrivateOrLocalIp = (ip) => {
  const value = String(ip || "").trim().toLowerCase();
  if (!value) return true;
  if (value === "::1" || value === "localhost") return true;
  if (value.startsWith("127.")) return true;
  if (value.startsWith("10.")) return true;
  if (value.startsWith("192.168.")) return true;
  if (value.startsWith("172.")) {
    const secondOctet = Number(value.split(".")[1] || -1);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  return false;
};

const getLocationFromIP = async (ip) => {
  const normalizedIp = String(ip || "").trim();
  if (!normalizedIp || isPrivateOrLocalIp(normalizedIp)) return "Unknown";

  try {
    const response = await axios.get(`https://ipapi.co/${encodeURIComponent(normalizedIp)}/json/`, {
      timeout: 5000,
    });

    const city = String(response?.data?.city || "").trim();
    const countryName = String(response?.data?.country_name || "").trim();
    const countryCode = String(response?.data?.country_code || "").trim();
    const flag = countryCodeToFlag(countryCode);

    const locationLabel = [city, countryName].filter(Boolean).join(", ").trim();
    if (!locationLabel) return "Unknown";

    return flag ? `${locationLabel} ${flag}` : locationLabel;
  } catch (error) {
    console.error("[GEO] ipapi error:", error?.message || error);
    return "Unknown";
  }
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

const signJwt = (user) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET manquant dans .env");

  return jwt.sign(
    { id: user._id, role: user.role || "USER" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const formatAuthUser = (user) => ({
  _id: user?._id,
  email: user?.email,
  role: user?.role || "USER",
});

const signLoginConfirmToken = ({ userId, email, deviceId }) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET manquant dans .env");

  return jwt.sign(
    {
      type: "LOGIN_CONFIRM",
      userId: String(userId),
      email: normalizeEmail(email),
      deviceId: String(deviceId || "").trim(),
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
};

const isForceEmailVerificationEnabled = () => {
  // Demo/defense mode toggle:
  // - FORCE_EMAIL_VERIFICATION=true forces email confirmation for every login
  // - ALWAYS_REQUIRE_EMAIL_VERIFICATION kept for backward compatibility
  const rawValue =
    process.env.FORCE_EMAIL_VERIFICATION ??
    process.env.ALWAYS_REQUIRE_EMAIL_VERIFICATION ??
    "false";
  return String(rawValue).trim().toLowerCase() === "true";
};

// -------------------- emails --------------------
const sendResetCodeEmail = async (toEmail, code) => {
  console.log("[EMAIL] forgot-password OTP request ->", normalizeEmail(toEmail));
  return sendOtpEmail({
    to: toEmail,
    code,
    purpose: "forgot-password",
    expiresMinutes: CODE_EXPIRE_MINUTES,
  });
};

const sendLoginOtpEmail = async (toEmail, code) => {
  console.log("[EMAIL] login OTP request ->", normalizeEmail(toEmail));
  return sendOtpEmail({
    to: toEmail,
    code,
    purpose: "login",
    expiresMinutes: LOGIN_OTP_EXPIRE_MINUTES,
  });
};
const sendLoginConfirmationEmail = async ({ toEmail, confirmUrl, denyUrl, details }) => {
  console.log("[EMAIL] login confirmation request ->", normalizeEmail(toEmail));
  return sendLoginConfirmationEmailByEmail({
    to: toEmail,
    confirmUrl,
    denyUrl,
    details,
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

      // ðŸ”¥ check if user exists
      const existing = await User.findOne({
        email: new RegExp("^" + normalizedEmail + "$", "i"),
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email dÃ©jÃ  utilisÃ©",
        });
      }

      // ðŸ”¥ hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // ðŸ”¥ create user
      const user = new User({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "VISITEUR",
      });

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Compte crÃ©Ã© avec succÃ¨s",
      });

    } catch (error) {
      console.error("SIGNUP ERROR ðŸ‘‰", error);
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

      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur introuvable pour cet email." });
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60 * 1000);

      await PasswordResetToken.updateMany({ email: normalizedEmail, used: false }, { $set: { used: true } });
      await PasswordResetToken.create({ email: normalizedEmail, code, expiresAt, used: false });
      user.resetOtp = code;
      user.resetOtpExpires = expiresAt;
      user.passwordResetOtp = code;
      user.passwordResetOtpExpiresAt = expiresAt;
      await user.save();

      await sendResetCodeEmail(normalizeEmail(user.email), code);

      await Notification.create({
        userId: user._id,
        title: "Reinitialisation mot de passe",
        message: "Demande recue pour : " + normalizedEmail,
        type: "warning",
        isRead: false,
        createdAt: Date.now(),
      });

      return res.status(200).json({ success: true, message: "OTP envoye a votre email." });
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
      const user = await User.findOne({
        email: { $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i") },
      });
      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
      }

      const userOtp = String(user.resetOtp || user.passwordResetOtp || "").trim();
      const userOtpExpires = user.resetOtpExpires || user.passwordResetOtpExpiresAt;
      if (
        userOtp &&
        userOtp === normalizedCode &&
        userOtpExpires &&
        new Date(userOtpExpires).getTime() > Date.now()
      ) {
        return res.status(200).json({ success: true });
      }

      const tokenDoc = await PasswordResetToken.findOne({
        email: normalizedEmail,
        code: normalizedCode,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!tokenDoc) return res.status(400).json({ success: false, message: "Code invalide, dÃ©jÃ  utilisÃ©, ou expirÃ©." });

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur vÃ©rification." });
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
      const user = await User.findOne({
        email: { $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i") },
      });
      if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

      const userOtp = String(user.resetOtp || user.passwordResetOtp || "").trim();
      const userOtpExpires = user.resetOtpExpires || user.passwordResetOtpExpiresAt;
      const isUserOtpValid =
        !!userOtp &&
        userOtp === normalizedCode &&
        !!userOtpExpires &&
        new Date(userOtpExpires).getTime() > Date.now();

      const tokenDoc = await PasswordResetToken.findOne({
        email: normalizedEmail,
        code: normalizedCode,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!isUserOtpValid && !tokenDoc) {
        return res.status(400).json({ success: false, message: "Code invalide, dÃ©jÃ  utilisÃ©, ou expirÃ©." });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      user.password = hash;
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
      user.passwordResetOtp = undefined;
      user.passwordResetOtpExpiresAt = undefined;
      await user.save();

      if (tokenDoc?._id) {
        await PasswordResetToken.findByIdAndUpdate(tokenDoc._id, { used: true }, { new: true });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur rÃ©initialisation." });
    }
  },

  requestPasswordReset: async (req, res) => {
    return module.exports.forgotPassword(req, res);
  },

  verifyPasswordResetOtp: async (req, res) => {
    return module.exports.verifyResetCode(req, res);
  },

  resetPasswordWithOtp: async (req, res) => {
    return module.exports.resetPassword(req, res);
  },

  // ===================== LOGIN SECURE =====================
  loginSecure: async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      const deviceId = String(
        req.body?.deviceId || req.body?.deviceInfo?.deviceId || "unknown-device"
      ).trim() || "unknown-device";

      console.log("[AUTH] login attempt:", email);
      console.log("[AUTH] deviceId:", deviceId);

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET manquant");
      }

      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email et mot de passe requis." });
      }

      const user = await User.findOne({ email: new RegExp("^" + escapeRegex(email) + "$", "i") });
      if (!user) return res.status(401).json({ success: false, message: "Identifiants invalides." });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ success: false, message: "Identifiants invalides." });
      console.log("LOGIN USER =", user);

      const forceVerification = isForceEmailVerificationEnabled();
      const trustedDevices = Array.isArray(user.trustedDevices) ? user.trustedDevices : [];
      const isTrustedDevice = trustedDevices.includes(deviceId);

      // Demo/debug logs requested for jury presentation and incident analysis.
      console.log("LOGIN:", email);
      console.log("DEVICE:", deviceId);
      console.log("isTrusted:", isTrustedDevice);
      console.log("FORCE MODE:", forceVerification);
      console.log("[AUTH] loginSecure", {
        email,
        userId: String(user._id),
        deviceId,
        isTrustedDevice,
        forceVerification,
      });

      // Adaptive authentication concept:
      // - Trusted known device + force mode off  => direct JWT login
      // - New device OR force mode on            => email confirmation required
      // This reduces account-takeover risk on unknown devices while preserving UX
      // on previously verified devices.
      if (isTrustedDevice && !forceVerification) {
        const token = signJwt(user);
        return res.status(200).json({
          success: true,
          token,
          user: formatAuthUser(user),
        });
      }

      // Otherwise, this login must be confirmed from email before issuing JWT.
      const confirmToken = signLoginConfirmToken({
        userId: user._id,
        email: user.email,
        deviceId,
      });

      const appUrl = String(process.env.APP_PUBLIC_URL || "http://localhost:4200").replace(/\/+$/, "");
      const confirmUrl = `${appUrl}/#/auth/confirm-login?token=${encodeURIComponent(confirmToken)}`;
      const denyUrl = `${appUrl}/#/auth/signin?securityAlert=1`;

      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress;
      const clientIp = String(ip || "").trim().replace(/^::ffff:/, "");
      const location = await getLocationFromIP(clientIp);
      console.log("[GEO] IP:", clientIp || "Unknown");
      console.log("[GEO] Location:", location);
      const device = getDeviceInfo(req);
      try {
        await sendLoginConfirmationEmail({
          toEmail: user.email,
          confirmUrl,
          denyUrl,
          details: {
            time: formatDateFR(new Date()),
            deviceLabel: [device.deviceVendor, device.deviceModel, device.deviceType]
              .filter(Boolean)
              .join(" ")
              .trim() || "Appareil inconnu",
            os: device.os,
            browser: device.browser,
            ip: clientIp,
            location,
          },
        });
      } catch (e) {
        console.error("FULL EMAIL ERROR:", e);
        return res.status(500).json({
          success: false,
          message: e?.message || "Erreur envoi email",
          code: e?.code || null,
        });
      }

      return res.status(200).json({
        success: true,
        requiresEmailConfirmation: true,
        message: "Verification email requise. Consultez votre boite mail.",
      });
    } catch (err) {
      console.error("[LOGIN ERROR]", err);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur login",
      });
    }
  },

  confirmLogin: async (req, res) => {
    const tokenFromBody = String(req.body?.token || "").trim();
    const tokenFromQuery = String(req.query?.token || "").trim();
    const confirmToken = tokenFromBody || tokenFromQuery;

    if (!confirmToken) {
      return res.status(400).json({ success: false, message: "Token de confirmation requis." });
    }

    try {
      const payload = jwt.verify(confirmToken, process.env.JWT_SECRET || "");
      if (payload?.type !== "LOGIN_CONFIRM") {
        return res.status(400).json({ success: false, message: "Token invalide." });
      }

      const userId = String(payload.userId || "");
      const deviceId = String(payload.deviceId || "").trim();
      if (!userId || !deviceId) {
        return res.status(400).json({ success: false, message: "Token incomplet." });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
      }

      const trustedDevices = new Set(Array.isArray(user.trustedDevices) ? user.trustedDevices : []);
      // Security rationale:
      // only after the user confirms from email, we trust this deviceId for
      // subsequent sign-ins and store it in trustedDevices.
      trustedDevices.add(deviceId);
      user.trustedDevices = Array.from(trustedDevices);
      await user.save();

      console.log("[AUTH] confirmLogin success", {
        userId: String(user._id),
        deviceId,
      });

      const token = signJwt(user);
      return res.status(200).json({ success: true, token, user: formatAuthUser(user) });
    } catch (error) {
      // Fallback OTP si token expiré.
      if (error?.name === "TokenExpiredError") {
        try {
          const decoded = jwt.decode(confirmToken) || {};
          const email = normalizeEmail(decoded.email);
          if (!email) {
            return res.status(401).json({
              success: false,
              requiresOtp: true,
              message: "Lien expire. OTP requis.",
            });
          }

          const user = await User.findOne({
            email: { $regex: new RegExp("^" + escapeRegex(email) + "$", "i") },
          });
          if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
          }

          const otp = generateCode();
          user.loginOtp = await bcrypt.hash(otp, 10);
          user.loginOtpExpires = new Date(Date.now() + LOGIN_OTP_EXPIRE_MINUTES * 60 * 1000);
          await user.save();
          await sendLoginOtpEmail(user.email, otp);

          console.log("[AUTH] confirmLogin token expire -> OTP fallback", {
            userId: String(user._id),
            email,
          });

          return res.status(401).json({
            success: false,
            requiresOtp: true,
            email,
            message: "Lien expire. Un OTP a ete envoye par email.",
          });
        } catch (otpError) {
          return res.status(500).json({
            success: false,
            message: otpError.message || "Impossible d'activer le fallback OTP.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: error?.message || "Token invalide.",
      });
    }
  },

  verifyLoginOtpFirstConnection: async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email et OTP sont requis." });
    }

    try {
      const user = await User.findOne({
        email: { $regex: new RegExp("^" + escapeRegex(email) + "$", "i") },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
      }

      if (!user.loginOtp || !user.loginOtpExpires) {
        return res.status(400).json({ success: false, message: "Aucun OTP actif. Veuillez vous reconnecter." });
      }

      if (new Date(user.loginOtpExpires).getTime() <= Date.now()) {
        user.loginOtp = undefined;
        user.loginOtpExpires = undefined;
        await user.save();
        return res.status(400).json({ success: false, message: "OTP expire. Veuillez vous reconnecter." });
      }

      let otpOk = false;
      if (String(user.loginOtp || "").startsWith("$2")) {
        otpOk = await bcrypt.compare(otp, user.loginOtp);
      } else {
        otpOk = String(user.loginOtp || "") === otp;
      }

      if (!otpOk) {
        return res.status(400).json({ success: false, message: "OTP invalide." });
      }

      user.loginOtp = undefined;
      user.loginOtpExpires = undefined;
      await user.save();

      const token = signJwt(user);
      return res.status(200).json({
        success: true,
        requireOtp: false,
        token,
        user: formatAuthUser(user),
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Erreur verification OTP." });
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

      if (!challenge) return res.status(400).send("Lien expirÃ© ou invalide.");

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
    const email = normalizeEmail(req.body?.email);

    if (!otp) {
      return res.status(400).json({ success: false, message: "Code OTP requis." });
    }

    // Compat frontend: quand challengeId est vide, verifier via email + loginOtp stocke sur User.
    if (!challengeId && email) {
      try {
        const user = await User.findOne({
          email: { $regex: new RegExp("^" + escapeRegex(email) + "$", "i") },
        });

        if (!user) {
          return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
        }

        if (!user.loginOtp || !user.loginOtpExpires) {
          return res.status(400).json({ success: false, message: "Aucun OTP actif. Reconnectez-vous." });
        }

        if (new Date(user.loginOtpExpires).getTime() <= Date.now()) {
          user.loginOtp = undefined;
          user.loginOtpExpires = undefined;
          await user.save();
          return res.status(400).json({ success: false, message: "OTP expire. Reconnectez-vous." });
        }

        let otpOk = false;
        if (String(user.loginOtp || "").startsWith("$2")) {
          otpOk = await bcrypt.compare(otp, user.loginOtp);
        } else {
          otpOk = String(user.loginOtp || "") === otp;
        }

        if (!otpOk) {
          return res.status(400).json({ success: false, message: "Code invalide." });
        }

        user.loginOtp = undefined;
        user.loginOtpExpires = undefined;
        await user.save();

        const token = signJwt(user);
        return res.status(200).json({ success: true, token, user: formatAuthUser(user) });
      } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Erreur serveur." });
      }
    }

    if (!challengeId) {
      return res.status(400).json({ success: false, message: "ChallengeId requis." });
    }

    try {
      const challenge = await LoginChallenge.findOne({
        _id: challengeId,
        status: "APPROVED",
        expiresAt: { $gt: new Date() },
      });

      if (!challenge || !challenge.otpHash) {
        return res.status(400).json({ success: false, message: "Code invalide ou expirÃ©." });
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

      return res.status(200).json({ success: true, verifiedInRuntime: true, token, user: formatAuthUser(user) });
    } catch {
      return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
  },
};
