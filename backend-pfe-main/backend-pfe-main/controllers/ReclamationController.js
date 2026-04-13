const Reclamation = require("../models/Reclamation");
const Notification = require("../models/Notification");
const Intervention = require("../models/intervention");
const User = require("../models/User");
const { detectType, detectUrgence } = require("../services/geminiService");

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

const mapReclamationType = (rawType) => {
  const key = String(rawType || "").trim().toUpperCase();
  return TYPE_MAP[key] || TYPE_MAP.AUTRE;
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

    const newRec = new Reclamation({
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

    return res.json({ msg: "Réclamation envoyée", data: newRec });
  } catch (err) {
    console.error("ADD RECLAMATION ERROR =", err);
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

    const existingIntervention = await Intervention.findOne({
      reclamationId: rec._id,
    }).select("_id");

    if (existingIntervention) {
      if (rec.status !== "ACCEPTEE") {
        rec.status = "ACCEPTEE";
        await rec.save();
      }

      return res.status(200).json({
        msg: "Réclamation déjà acceptée",
        interventionId: existingIntervention._id,
      });
    }

    rec.status = "ACCEPTEE";
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
      createdBy: rec.createdBy,
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
        status: "ACCEPTEE",
        interventionId: intervention._id,
        interventionType: mappedType,
        autoAssigned: isAssigned,
        technicianId: technicien?._id || null,
      },
    });

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
