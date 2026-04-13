const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Fournisseur = require("../models/fournisseur");
const mongoose = require("mongoose");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const OTP_EXPIRE_MINUTES = 10;
const RESET_TOKEN_EXPIRE_MINUTES = 15;

const generateOtpCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOtpEmail = async (toEmail, otpCode) => {
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
    throw new Error(
      "Configuration SMTP manquante (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)."
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: "Code de verification - Reinitialisation mot de passe",
      text:
        "Bonjour,\n\n" +
        "Votre code OTP est: " +
        otpCode +
        "\n\n" +
        "Ce code expire dans " +
        OTP_EXPIRE_MINUTES +
        " minutes.\n",
    });
  } catch (error) {
    if (
      error?.responseCode === 535 ||
      String(error?.message || "").includes("BadCredentials")
    ) {
      throw new Error(
        "Identifiants SMTP invalides. Pour Gmail, utilisez SMTP_USER et un mot de passe d'application (App Password)."
      );
    }
    throw error;
  }
};

module.exports = {
  // craete user
  createuser: async (req, res) => {
    const { name, email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password || !role) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) throw Error("User already exists");

      const salt = await bcrypt.genSalt(10);
      if (!salt) throw Error("Something went wrong with bcrypt");

      const hash = await bcrypt.hash(password, salt);
      if (!hash) throw Error("Something went wrong hashing the password");
      let newUser = new User({
        name,
        email: normalizedEmail,
        password: hash,
        role: role,
      });
      if (req.body.service) {
        newUser = new User({
          name,
          email: normalizedEmail,
          password: hash,
          service: req.body.service,
          role: req.body.role,
        });
      }

      const savedUser = await newUser.save();

      if (!savedUser) throw Error("Something went wrong saving the user");

      /* const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
        expiresIn: 3600,
      }); */

      res.status(200).json({
        message: "user successfuly registred",
        user: savedUser,
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },

  createFournisseur: async (req, res) => {
    const { name, email, tel } = req.body;

    if (!name || !email || !tel) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    try {
      let newFour = new Fournisseur({
        name,
        email,
        tel,
      });

      const savedUser = await newFour.save();

      if (!savedUser) throw Error("Something went wrong saving the fournisseur");

      /* const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
        expiresIn: 3600,
      }); */

      res.status(200).json({
        message: "user successfuly registred",
        user: savedUser,
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },

  getuserbyid: (req, res) => {
    User.findById({ _id: req.user.id }, (err, user) => {
      if (!user) {
        res.status(500).json({
          message: "user not found ",
          data: null,
        });
      } else {
        res.status(200).json({
          message: "user found ",
          data: user,
        });
      }
    });
  },

  getuserbyidparam: (req, res) => {
    User.findById({ _id: req.params.id }, (err, user) => {
      if (err || !user) {
        res.status(404).json({
          message: "user not found",
          data: null,
        });
      } else {
        res.status(200).json({
          message: "user found",
          data: user,
        });
      }
    });
  },

  updateuser: async (req, res) => {
    const payload = {};

    if (req.body.name !== undefined && String(req.body.name).trim() !== "") {
      payload.name = req.body.name;
    }

    if (req.body.email !== undefined && String(req.body.email).trim() !== "") {
      payload.email = normalizeEmail(req.body.email);
    }

    if (req.body.role !== undefined && String(req.body.role).trim() !== "") {
      payload.role = req.body.role;
    }

    if (
      req.body.service !== undefined &&
      req.body.service !== null &&
      String(req.body.service).trim() !== ""
    ) {
      payload.service = req.body.service;
    }

    if (
      req.body.password !== undefined &&
      String(req.body.password).trim() !== ""
    ) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(req.body.password, salt);
      payload.password = hash;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(200).json({
        message: "no field changed",
        data: null,
      });
    }

    if (payload.email) {
      const existingUser = await User.findOne({
        email: payload.email,
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "email already exists",
          data: null,
        });
      }
    }

    User.findByIdAndUpdate(
      { _id: req.params.id },
      payload,
      { new: true },
      (err, user) => {
        if (err) {
          res.status(400).json({
            message: err.message || "user not updated",
            data: null,
          });
        } else if (!user) {
          res.status(404).json({
            message: "user not found",
            data: null,
          });
        } else {
          res.status(200).json({
            message: "user updated successfuly ",
            data: user,
          });
        }
      }
    );
  },

  deleteFournisseur: (req, res) => {
    Fournisseur.findByIdAndDelete({ _id: req.params.id }, (err, user) => {
      if (err) {
        res.status(500).json({
          message: "Fournisseur not deleted ",
          data: null,
          status: 500,
        });
      } else {
        res.status(200).json({
          message: "Fournisseur deletd successfuly ",
          data: null,
          status: 200,
        });
      }
    });
  },

  deleteuser: (req, res) => {
    User.findByIdAndDelete({ _id: req.params.id }, (err, user) => {
      if (err) {
        res.status(500).json({
          message: "user not deleted ",
          data: null,
          status: 500,
        });
      } else {
        res.status(200).json({
          message: "user deletd successfuly ",
          data: null,
          status: 200,
        });
      }
    });
  },

  getallusers: (req, res) => {
    User.find({}, (err, users) => {
      if (users.length <= 0) {
        res.status(500).json({
          message: "no users in system ",
          data: null,
        });
      } else {
        res.status(200).json({
          message: "users in system ",
          data: users,
        });
      }
    });
  },

  getAllFournisseur: (req, res) => {
    Fournisseur.find({}, (err, fournisseurs) => {
      if (fournisseurs.length <= 0) {
        res.status(500).json({
          message: "no fournisseurs in system ",
          data: null,
        });
      } else {
        res.status(200).json({
          message: "fournisseurs in system ",
          data: fournisseurs,
        });
      }
    });
  },

  getFournisseurById: (req, res) => {
    Fournisseur.findById({ _id: req.params.id }, (err, fournisseur) => {
      if (err || !fournisseur) {
        res.status(404).json({
          message: "fournisseur not found",
          data: null,
        });
      } else {
        res.status(200).json({
          message: "fournisseur found",
          data: fournisseur,
        });
      }
    });
  },

  updateFournisseur: (req, res) => {
    const payload = {};

    if (req.body.name !== undefined && String(req.body.name).trim() !== "") {
      payload.name = req.body.name;
    }
    if (req.body.email !== undefined && String(req.body.email).trim() !== "") {
      payload.email = req.body.email;
    }
    if (req.body.tel !== undefined && String(req.body.tel).trim() !== "") {
      payload.tel = req.body.tel;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(200).json({
        message: "no field changed",
        data: null,
      });
    }

    Fournisseur.findByIdAndUpdate(
      { _id: req.params.id },
      payload,
      { new: true },
      (err, fournisseur) => {
        if (err) {
          res.status(400).json({
            message: err.message || "fournisseur not updated",
            data: null,
          });
        } else if (!fournisseur) {
          res.status(404).json({
            message: "fournisseur not found",
            data: null,
          });
        } else {
          res.status(200).json({
            message: "fournisseur updated successfuly",
            data: fournisseur,
          });
        }
      }
    );
  },

  authenticate: async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    // Simple validation
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    try {
      const user = await User.findOne({
        email: {
          $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i"),
        },
      });

      if (!user) {
        return res.status(401).json({
          message: "user with this email does not exist",
        });
      }

      let isMatch = false;

      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        // Backward compatibility for legacy records with plain-text password.
        isMatch = String(password) === String(user.password);
      }

      if (!isMatch) {
        return res.status(401).json({
          message: "invalid password",
        });
      }

      if (String(user.password) === String(password)) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await User.findByIdAndUpdate(
          { _id: user._id },
          { password: hash },
          { new: true }
        );
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          message: "JWT_SECRET manquant dans .env",
        });
      }

      const token = jwt.sign({ id: user._id, role: user.role || "USER" }, process.env.JWT_SECRET);

      return res.status(200).json({
        token: token,
        role: user.role,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message || "Authentication failed",
      });
    }
  },

  requestPasswordReset: async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const user = await User.findOne({
        email: {
          $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i"),
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "Aucun utilisateur n'est associe a cet email.",
        });
      }

      const otpCode = generateOtpCode();
      const otpExpiresAt = new Date(
        Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000
      );

      await sendOtpEmail(user.email, otpCode);

      await User.findByIdAndUpdate(
        { _id: user._id },
        {
          passwordResetOtp: otpCode,
          passwordResetOtpExpiresAt: otpExpiresAt,
          passwordResetToken: null,
          passwordResetTokenExpiresAt: null,
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Code OTP envoye par email.",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message || "Erreur lors de l'envoi du code OTP.",
      });
    }
  },

  resendPasswordResetOtp: async (req, res) => {
    return module.exports.requestPasswordReset(req, res);
  },

  verifyPasswordResetOtp: async (req, res) => {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = String(otp || "").trim();

    if (!normalizedEmail || !normalizedOtp) {
      return res.status(400).json({
        message: "Email et code OTP sont obligatoires.",
      });
    }

    try {
      const user = await User.findOne({
        email: {
          $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i"),
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "Utilisateur introuvable.",
        });
      }

      if (!user.passwordResetOtp || !user.passwordResetOtpExpiresAt) {
        return res.status(400).json({
          message: "Aucune demande OTP en cours. Relancez la reinitialisation.",
        });
      }

      if (new Date(user.passwordResetOtpExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({
          message: "Le code OTP a expire. Demandez un nouveau code.",
        });
      }

      if (String(user.passwordResetOtp) !== normalizedOtp) {
        return res.status(400).json({
          message: "Code OTP invalide.",
        });
      }

      const resetToken = crypto.randomBytes(24).toString("hex");
      const resetTokenExpiresAt = new Date(
        Date.now() + RESET_TOKEN_EXPIRE_MINUTES * 60 * 1000
      );

      await User.findByIdAndUpdate(
        { _id: user._id },
        {
          passwordResetToken: resetToken,
          passwordResetTokenExpiresAt: resetTokenExpiresAt,
          passwordResetOtp: null,
          passwordResetOtpExpiresAt: null,
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Code OTP valide.",
        resetToken,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message || "Erreur lors de la verification OTP.",
      });
    }
  },

  resetPasswordWithOtp: async (req, res) => {
    const { email, resetToken, newPassword, confirmPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Les mots de passe ne correspondent pas.",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 8 caracteres.",
      });
    }

    try {
      const user = await User.findOne({
        email: {
          $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i"),
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "Utilisateur introuvable.",
        });
      }

      if (!user.passwordResetToken || !user.passwordResetTokenExpiresAt) {
        return res.status(400).json({
          message:
            "Session de reinitialisation invalide. Recommencez le processus.",
        });
      }

      if (String(user.passwordResetToken) !== String(resetToken)) {
        return res.status(400).json({
          message: "Jeton de reinitialisation invalide.",
        });
      }

      if (new Date(user.passwordResetTokenExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({
          message: "Le jeton de reinitialisation a expire.",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);

      await User.findByIdAndUpdate(
        { _id: user._id },
        {
          password: hash,
          passwordResetOtp: null,
          passwordResetOtpExpiresAt: null,
          passwordResetToken: null,
          passwordResetTokenExpiresAt: null,
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Mot de passe modifie avec succes.",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message || "Erreur lors de la mise a jour du mot de passe.",
      });
    }
  },

  forgotPassword: async (req, res) => {
    return module.exports.requestPasswordReset(req, res);
  },

  uploadavatar: (req, res) => {
    const data = {
      avatar: req.file.filename,
    };

    User.findByIdAndUpdate({ _id: req.user.id }, data, (err, user) => {
      if (err) {
        res.status(500).json({ message: "avatar not uploaded" });
      } else {
        User.findById({ _id: user._id }, (nerr, nuser) => {
          if (nerr) {
            res.json("error");
          } else {
            res.status(200).json({
              message: "user updated",
              data: nuser,
            });
          }
        });
      }
    });
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    const fs = require('fs');
    const logPath = './profile_debug.log';
    const log = (msg) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);

    try {
      log(`Update request started for User ID: ${req.user?.id}`);
      log(`Body: ${JSON.stringify(req.body)}`);
      log(`File: ${req.file ? req.file.filename : 'No file'}`);

      if (!req.user || !req.user.id) {
        log("Error: User not authenticated (req.user.id missing)");
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const { name, email, phone, address } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = normalizeEmail(email);
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;

      if (req.file) {
        updateData.image = req.file.filename;
        log(`Setting image to: ${req.file.filename}`);
      }

      // Check email uniqueness
      if (updateData.email) {
        const currentUser = await User.findById(req.user.id);
        if (currentUser && currentUser.email !== updateData.email) {
          log(`Email changed from ${currentUser.email} to ${updateData.email}. Checking uniqueness...`);
          const existingUser = await User.findOne({ email: updateData.email });
          if (existingUser) {
            log(`Error: Email ${updateData.email} already in use by user ${existingUser._id}`);
            return res.status(400).json({ message: "Cet email est déjà utilisé par un autre compte" });
          }
        }
      }

      log(`Ready to update user ${req.user.id} with data: ${JSON.stringify(updateData)}`);

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true }
      ).select("-password");

      if (!updatedUser) {
        log(`Error: User ${req.user.id} not found in database for update`);
        return res.status(404).json({ message: "Utilisateur introuvable en base de données" });
      }

      log(`Update successful for user ${req.user.id}`);
      res.status(200).json({
        message: "Profil mis à jour avec succès",
        data: updatedUser,
      });
    } catch (error) {
      log(`CRITICAL ERROR: ${error.message}\nStack: ${error.stack}`);
      console.error("Backend updateProfile error:", error);
      res.status(500).json({ 
        message: "Erreur serveur lors de la mise à jour", 
        error: error.message 
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Tous les champs sont obligatoires." });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Le nouveau mot de passe et sa confirmation ne correspondent pas." });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      // Verify current password
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(currentPassword, user.password);
      } catch (error) {
        isMatch = String(currentPassword) === String(user.password);
      }

      if (!isMatch) {
        return res.status(401).json({ message: "Le mot de passe actuel est incorrect." });
      }

      // Hash and save new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.status(200).json({ message: "Mot de passe modifié avec succès." });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors du changement de mot de passe.", error: error.message });
    }
  },
};
