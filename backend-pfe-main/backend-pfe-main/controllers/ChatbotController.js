const User = require("../models/User");
const Intervention = require("../models/intervention");

const TYPE_KEYWORDS = [
  { keywords: ["plomberie", "plombier", "plomb"], type: "PLOMBERIE", roles: ["PLOMBIER", "PLOMBERIE"] },
  { keywords: ["electrique", "electrique", "electricien", "electricite", "électrique", "électricité"], type: "ELECTRIQUE", roles: ["ELECTRICIEN"] },
  { keywords: ["mecanique", "mecanicien", "moteur", "mécanique", "mécanique"], type: "MECANIQUE", roles: ["MECANICIEN"] },
];

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const detectTechnicianType = (message) => {
  const normalizedMessage = normalizeText(message);
  return TYPE_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)))
  );
};

exports.chatbot = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Le message est obligatoire." });
    }

    const detectedType = detectTechnicianType(message);
    if (!detectedType) {
      return res.status(200).json({
        name: null,
        charge: null,
        message:
          "Je n'ai pas detecte la specialite demandee. Essayez avec plomberie, electrique ou mecanique.",
      });
    }

    const techniciens = await User.find({
      role: { $in: detectedType.roles },
    }).select("_id name role");

    if (!techniciens.length) {
      return res.status(200).json({
        name: null,
        charge: null,
        message: `Aucun technicien ${detectedType.type.toLowerCase()} disponible pour le moment.`,
      });
    }

    const technicianLoads = await Promise.all(
      techniciens.map(async (tech) => {
        const interventionsEnCours = await Intervention.countDocuments({
          assignedTo: tech._id,
          etat: { $ne: "TERMINEE" },
        });

        return {
          tech,
          charge: interventionsEnCours,
          score: 100 - interventionsEnCours * 10,
        };
      })
    );

    technicianLoads.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.charge !== b.charge) return a.charge - b.charge;
      return String(a.tech.name || "").localeCompare(String(b.tech.name || ""));
    });

    const best = technicianLoads[0];

    return res.status(200).json({
      name: best.tech.name,
      charge: best.charge,
      message: `${best.tech.name} disponible avec ${best.charge} intervention${best.charge > 1 ? "s" : ""} en cours`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur chatbot.",
      error: error.message,
    });
  }
};
