const Reclamation = require("../models/Reclamation");
const Notification = require("../models/Notification");
const Intervention = require("../models/intervention");
const User = require("../models/User");
const { detectType, detectUrgence } = require("../services/geminiService");
const { sendEmail: sendEmailViaApi } = require("../services/email.service");

const TYPE_MAP = {
  ELECTRIQUE: "ELECTRIQUE",
  INFORMATIQUE: "INFORMATIQUE",
  MECANIQUE: "MECANIQUE",
  PLOMBERIE: "PLOMBERIE",
  AUTRE: "AUTRE",
};

const ROLE_MAP = {
  ELECTRIQUE: "ELECTRICIEN",
  INFORMATIQUE: "INFORMATICIEN",
  MECANIQUE: "MECANICIEN",
  PLOMBERIE: "PLOMBIER",
};

const sendEmail = async (rec) => {
  const email = String(rec?.email || "").trim();
  if (!email) return;

  const appUrl = String(process.env.APP_PUBLIC_URL || "").trim();
  const isLocalUrl =
    /localhost/i.test(appUrl) ||
    /127\.0\.0\.1/.test(appUrl) ||
    /192\.168\./.test(appUrl);

  if (!appUrl || isLocalUrl) {
    throw new Error("APP_PUBLIC_URL doit etre une URL publique (pas localhost ni 192.168.x.x).");
  }

  const baseAppUrl = appUrl.replace(/\/+$/, "");
  const safeName = String(rec?.nom || "Client").trim() || "Client";
  const safeCode = String(rec?.code || "").trim() || "N/A";
  const trackingUrl = `${baseAppUrl}/suivi-reclamation?code=${safeCode}`;

  const html = `
<div style="font-family: Arial, sans-serif; background:#f4f6f9; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 5px 20px rgba(0,0,0,0.08);">
    <div style="background:#0d6efd; color:white; padding:20px; text-align:center;">
      <h2 style="margin:0;">Service de Gestion des Interventions</h2>
    </div>
    <div style="padding:25px;">
      <p style="font-size:15px;">Bonjour <strong>${safeName}</strong>,</p>
      <p style="font-size:15px; line-height:1.6;">
        Nous vous remercions sincerement pour votre signalement.
        Votre reclamation a ete <strong>prise en charge avec succes</strong> et est actuellement en cours de traitement par nos equipes techniques.
      </p>
      <div style="background:#f1f5ff; padding:15px; border-radius:8px; text-align:center; margin:20px 0;">
        <p style="margin:0; font-size:14px;">Votre code de suivi</p>
        <h3 style="margin:5px 0; color:#0d6efd;">${safeCode}</h3>
      </div>
      <p style="font-size:15px; line-height:1.6;">
        Vous pouvez suivre l'evolution de votre demande en temps reel en cliquant sur le bouton ci-dessous :
      </p>
      <div style="text-align:center; margin:25px 0;">
        <a href="${trackingUrl}" style="background:#198754; color:white; padding:12px 22px; text-decoration:none; border-radius:6px; font-weight:bold;">
          Suivre ma reclamation
        </a>
      </div>
      <p style="font-size:14px; line-height:1.6;">
        Notre equipe met tout en oeuvre afin de traiter votre demande dans les meilleurs delais.
        Nous restons a votre disposition pour toute information complementaire.
      </p>
      <p style="font-size:14px;">Nous vous remercions pour votre confiance.</p>
    </div>
    <div style="background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#6c757d;">
      <p style="margin:0;">© Service Support Technique - Gestion des Interventions</p>
      <p style="margin:5px 0 0;">Ceci est un message automatique, merci de ne pas y repondre.</p>
    </div>
  </div>
</div>
`;

  await sendEmailViaApi(email, "Votre reclamation est prise en charge", html);
  console.log("[EMAIL] sent", { to: email, subject: "Votre reclamation est prise en charge" });
};

const mapReclamationType = (rawType) => {
  const key = String(rawType || "").trim().toUpperCase();
  return TYPE_MAP[key] || TYPE_MAP.AUTRE;
};

const generateReclamationCode = async () => {
  const year = new Date().getFullYear();
  const count = await Reclamation.countDocuments();

  let sequence = count + 1;
  let code = `REC-${year}-${String(sequence).padStart(4, "0")}`;

  // Prevent duplicate codes in concurrent requests.
  while (await Reclamation.exists({ code })) {
    sequence += 1;
    code = `REC-${year}-${String(sequence).padStart(4, "0")}`;
  }

  return code;
};

const mapUrgenceToDegree = (rawUrgence) => {
  const urgence = String(rawUrgence || "").trim().toUpperCase();

  if (urgence === "CRITIQUE") return "Haute";
  if (urgence === "URGENT") return "Moyenne";
  return "Normal";
};

const mapUrgenceToDelayDays = (rawUrgence) => {
  const urgence = String(rawUrgence || "").trim().toUpperCase();

  if (urgence === "CRITIQUE") return 1;
  if (urgence === "URGENT") return 2;
  return 3;
};

const mapTrackingStatus = (reclamationStatus, interventionState) => {
  const intervention = String(interventionState || "").toUpperCase();
  const reclamation = String(reclamationStatus || "").toUpperCase();

  if (intervention === "TERMINEE") return "TERMINEE";
  if (intervention === "EN_COURS" || reclamation === "ACCEPTEE" || reclamation === "EN_COURS") return "EN_COURS";
  return "EN_ATTENTE";
};

const isAdminUser = async (userId) => {
  if (!userId) return false;

  const user = await User.findById(userId).select("role");
  return String(user?.role || "").toUpperCase() === "ADMIN";
};

const findLeastBusyTechnician = async (role) => {
  if (!role) return null;

  const techniciens = await User.find({ role }).select("_id role");
  if (!techniciens.length) return null;

  const withLoads = await Promise.all(
    techniciens.map(async (tech) => {
      const activeInterventionsCount = await Intervention.countDocuments({
        assignedTo: tech._id,
        etat: { $ne: "TERMINEE" },
      });

      return {
        technicien: tech,
        load: activeInterventionsCount,
      };
    })
  );

  withLoads.sort((a, b) => a.load - b.load);
  return withLoads[0]?.technicien || null;
};

exports.addReclamation = async (req, res) => {
  try {
    const description = String(req.body.description || "").trim();
    const lieu = String(req.body.lieu || "").trim();

    if (!description) {
      return res.status(400).json({ msg: "Description obligatoire" });
    }

    if (!lieu) {
      return res.status(400).json({ msg: "Lieu obligatoire" });
    }

    const aiType = await detectType(description);
    const aiUrgence = await detectUrgence(description);
    const code = await generateReclamationCode();

    const newRec = new Reclamation({
      code,
      description,
      lieu,
      type: aiType,
      urgence: aiUrgence,
      contact: String(req.body.contact || "").trim(),
      images: req.files?.map((file) => file.filename) || [],
      createdBy: req.user.id,
      status: "EN_ATTENTE",
    });

    await newRec.save();

    const admins = await User.find({ role: "ADMIN" }).select("_id");

    if (admins.length > 0) {
      await Promise.all(
        admins.map((admin) =>
          Notification.create({
            userId: admin._id,
            title: "Nouvelle réclamation",
            message: "Nouvelle réclamation envoyée",
            category: "RECLAMATION",
            type: "RECLAMATION",
            isRead: false,
            metadata: {
              description: newRec.description,
              lieu: newRec.lieu,
              reclamationId: newRec._id,
              interventionType: newRec.type,
            },
          })
        )
      );
    }

    return res.status(201).json({
      msg: "Réclamation envoyée avec succès",
      message: "Réclamation envoyée avec succès",
      code: newRec.code,
      data: newRec,
    });
  } catch (err) {
    console.error("ADD RECLAMATION ERROR =", err);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
};

exports.addPublicReclamation = async (req, res) => {
  try {
    const nom = String(req.body.nom || "").trim();
    const prenom = String(req.body.prenom || "").trim();
    const email = String(req.body.email || "").trim();
    const nationalite = String(req.body.nationalite || "").trim();
    const langue = String(req.body.langue || "").trim();
    const typeIntervention = String(req.body.typeIntervention || "").trim();
    const description = String(req.body.description || "").trim();

    if (!nom || !prenom || !email || !nationalite || !langue || !typeIntervention || !description) {
      return res.status(400).json({ msg: "Tous les champs obligatoires doivent etre renseignes" });
    }

    const images = req.files?.map((file) => file.filename) || [];

    const normalizedType = mapReclamationType(typeIntervention);
    const code = await generateReclamationCode();

    const newRec = new Reclamation({
      code,
      nom,
      prenom,
      email,
      nationalite,
      langue,
      typeIntervention,
      description,
      images,
      status: "EN_ATTENTE",

      // Keep legacy fields populated so existing admin workflows continue to work.
      lieu: String(req.body.lieu || "RECLAMATION_PUBLIQUE"),
      type: normalizedType,
      urgence: String(req.body.aiUrgence || "NORMAL").toUpperCase(),
      contact: email,
    });

    await newRec.save();

    return res.status(201).json({
      msg: "Réclamation envoyée avec succès",
      message: "Réclamation envoyée avec succès",
      code: newRec.code,
      data: newRec,
    });
  } catch (err) {
    console.error("ADD PUBLIC RECLAMATION ERROR =", err);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
};

exports.getAll = async (req, res) => {
  try {
    let query = {};

    if (String(req.user.role || "").toUpperCase() !== "ADMIN") {
      query = { createdBy: req.user.id };
    }

    const data = await Reclamation.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(data);
  } catch (err) {
    console.error("GET RECLAMATIONS ERROR =", err);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
};

exports.trackReclamationByCode = async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ msg: "Code invalide" });
    }

    const reclamation = await Reclamation.findOne({ code }).lean();

    if (!reclamation) {
      return res.status(404).json({ msg: "Aucune reclamation trouvee pour ce code" });
    }

    const intervention = await Intervention.findOne({ reclamationId: reclamation._id })
      .sort({ createdAt: -1 })
      .select("etat")
      .lean();

    const etat = mapTrackingStatus(reclamation.status, intervention?.etat);

    return res.status(200).json({
      code: reclamation.code,
      typeIntervention: reclamation.typeIntervention || reclamation.type || "AUTRE",
      description: reclamation.description,
      etat,
      status: reclamation.status,
      createdAt: reclamation.createdAt,
    });
  } catch (err) {
    console.error("TRACK RECLAMATION ERROR =", err);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
};

exports.acceptReclamation = async (req, res) => {
  try {
    const isAdmin = await isAdminUser(req.user?.id);

    if (!isAdmin) {
      return res.status(403).json({ msg: "Accès réservé aux admins" });
    }

    const rec = await Reclamation.findById(req.params.id);

    if (!rec) {
      return res.status(404).json({ msg: "Réclamation introuvable" });
    }

    console.log("ACCEPT RECLAMATION:", rec);
    console.log("EMAIL:", rec.email);

    const existingIntervention = await Intervention.findOne({
      reclamationId: rec._id,
    }).select("_id");

    if (existingIntervention) {
      if (rec.status !== "EN_COURS") {
        rec.status = "EN_COURS";
        await rec.save();
      }

      if (rec.email) {
        try {
          await sendEmail(rec);
        } catch (mailError) {
          console.error("RECLAMATION ACCEPT EMAIL ERROR =", mailError?.message || mailError);
        }
      }

      return res.status(200).json({
        msg: "Réclamation déjà acceptée",
        interventionId: existingIntervention._id,
      });
    }

    rec.status = "EN_COURS";
    await rec.save();

    const mappedType = mapReclamationType(rec.type || rec.problemType || "");
    const degree = mapUrgenceToDegree(rec.urgence);
    const delayDays = mapUrgenceToDelayDays(rec.urgence);

    const targetRole = ROLE_MAP[mappedType];
    const technicien = targetRole
      ? await findLeastBusyTechnician(targetRole)
      : null;

    const isAssigned = Boolean(technicien?._id);

    const intervention = new Intervention({
      name: mappedType,
      type: mappedType,
      description: `${rec.description}\n\n[AI] Analyse automatique: ${mappedType}`,
      lieu: rec.lieu,
      createdBy: rec.createdBy || req.user?.id,
      reclamationId: rec._id,
      isAI: true,
      aiDetails: "Intervention generee automatiquement par l'intelligence artificielle",
      etat: isAssigned ? "EN_COURS" : "NON_AFFECTEE",
      assignedTo: isAssigned ? technicien._id : undefined,
      affectedBy: isAssigned ? technicien._id : undefined,
      affectedToUsers: isAssigned ? [technicien._id] : [],
      degree,
      dateDebut: new Date(),
      delai: new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000),
    });

    await intervention.save();

    await Notification.deleteMany({
      category: "RECLAMATION",
      "metadata.reclamationId": rec._id,
    });

    if (rec.createdBy) {
      try {
        await Notification.create({
          userId: rec.createdBy,
          title: "Réclamation acceptée",
          message:
            "Votre réclamation a été acceptée. Une intervention a été créée automatiquement.",
          category: "RECLAMATION",
          type: "INFO",
          isRead: false,
          metadata: {
            reclamationId: rec._id,
            status: "EN_COURS",
            interventionId: intervention._id,
            interventionType: mappedType,
            autoAssigned: isAssigned,
            technicianId: technicien?._id || null,
          },
        });
      } catch (notificationError) {
        console.error("RECLAMATION ACCEPT NOTIFICATION ERROR =", notificationError?.message || notificationError);
      }
    }

    if (rec.email) {
      try {
        await sendEmail(rec);
      } catch (mailError) {
        console.error("RECLAMATION ACCEPT EMAIL ERROR =", mailError?.message || mailError);
      }
    }

    return res.status(200).json({
      msg: "Réclamation acceptée et intervention créée avec succès",
      interventionId: intervention._id,
      autoAssigned: isAssigned,
      technicianId: technicien?._id || null,
    });
  } catch (err) {
    console.error("ACCEPT RECLAMATION ERROR =", err);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
};

exports.refuseReclamation = async (req, res) => {
  try {
    const isAdmin = await isAdminUser(req.user?.id);

    if (!isAdmin) {
      return res.status(403).json({ msg: "Accès réservé aux admins" });
    }

    const rec = await Reclamation.findById(req.params.id);

    if (!rec) {
      return res.status(404).json({ msg: "Réclamation introuvable" });
    }

    rec.status = "REFUSEE";
    await rec.save();

    await Notification.create({
      userId: rec.createdBy,
      title: "Réclamation refusée",
      message: "Votre réclamation a été refusée",
      category: "RECLAMATION",
      type: "INFO",
      isRead: false,
      metadata: {
        reclamationId: rec._id,
        status: "REFUSEE",
      },
    });

    return res.json({ msg: "Réclamation refusée" });
  } catch (err) {
    console.error("REFUSE RECLAMATION ERROR =", err);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
};




