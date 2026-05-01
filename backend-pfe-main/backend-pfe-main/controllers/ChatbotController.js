const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Intervention = require("../models/intervention");
const ChatMessage = require("../models/ChatMessage");

const SUPPORTED_INTENTS = [
  "best",
  "available",
  "list",
  "count",
  "count_mine",
  "by_status",
  "by_type",
  "overdue",
  "least_loaded",
  "most_loaded",
  "summary",
  "clarify",
];

const SUPPORTED_TYPES = ["ELECTRIQUE", "PLOMBERIE", "MECANIQUE", "INFORMATIQUE", "AUTRE", null];
const TECHNICIAN_ROLES = ["TECHNICIEN", "ELECTRICIEN", "MECANICIEN", "PLOMBIER", "PLOMBERIE", "INFORMATICIEN"];

const TYPE_TO_ROLES = {
  ELECTRIQUE: ["ELECTRICIEN", "TECHNICIEN"],
  PLOMBERIE: ["PLOMBIER", "PLOMBERIE", "TECHNICIEN"],
  MECANIQUE: ["MECANICIEN", "TECHNICIEN"],
  INFORMATIQUE: ["INFORMATICIEN", "TECHNICIEN"],
  AUTRE: ["TECHNICIEN"],
};

const conversationMemory = new Map();

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

function detectIntent(message) {
  const text = String(message || "").toLowerCase();

  let intent = null;
  let type = null;

  if (text.includes("plomb")) type = "PLOMBERIE";
  else if (text.includes("elect")) type = "ELECTRIQUE";
  else if (text.includes("mecan")) type = "MECANIQUE";
  else if (text.includes("info") || text.includes("informat")) type = "INFORMATIQUE";

  if (text.includes("meilleur") || text.includes("ahsen") || text.includes("plus performant")) {
    intent = "best";
  } else if (text.includes("disponible") || text.includes("0") || text.includes("free")) {
    intent = "available";
  } else if (text.includes("liste") || text.includes("tous") || text.includes("list")) {
    intent = "list";
  } else if (text.includes("combien") || text.includes("9adeh") || text.includes("nombre")) {
    intent = "count";
  } else if (text.includes("retard") || text.includes("overdue")) {
    intent = "overdue";
  } else if (text.includes("etat") || text.includes("status")) {
    intent = "by_status";
  } else if (text.includes("type")) {
    intent = "by_type";
  } else if (text.includes("resume") || text.includes("summary")) {
    intent = "summary";
  }

  return { intent, type };
}

const normalizeIntent = (value) => {
  const intent = String(value || "").trim().toLowerCase();
  return SUPPORTED_INTENTS.includes(intent) ? intent : "clarify";
};

const normalizeType = (value) => {
  if (value === null) return null;
  const t = String(value || "").trim().toUpperCase();
  return SUPPORTED_TYPES.includes(t) ? t : null;
};

const getTechniciansByType = async (type) => {
  const roles = type ? TYPE_TO_ROLES[type] || TECHNICIAN_ROLES : TECHNICIAN_ROLES;
  return User.find({ role: { $in: roles } }).select("_id name role");
};

const getStatsByTechnician = async (technicianIds) => {
  if (!technicianIds.length) return new Map();

  const grouped = await Intervention.aggregate([
    { $match: { assignedTo: { $in: technicianIds } } },
    {
      $group: {
        _id: "$assignedTo",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$etat", "TERMINEE"] }, 1, 0] } },
        refused: { $sum: { $cond: [{ $eq: ["$etat", "REFUSEE"] }, 1, 0] } },
        ongoing: { $sum: { $cond: [{ $ne: ["$etat", "TERMINEE"] }, 1, 0] } },
      },
    },
  ]);

  const map = new Map();
  grouped.forEach((item) => {
    map.set(String(item._id), {
      total: item.total || 0,
      done: item.done || 0,
      refused: item.refused || 0,
      ongoing: item.ongoing || 0,
      score: (item.done || 0) - (item.refused || 0) * 2,
    });
  });

  return map;
};

const getEnrichedTechnicians = async (type) => {
  const technicians = await getTechniciansByType(type);
  if (!technicians.length) return [];

  const statsMap = await getStatsByTechnician(technicians.map((t) => t._id));
  return technicians.map((tech) => {
    const s = statsMap.get(String(tech._id)) || { total: 0, done: 0, refused: 0, ongoing: 0, score: 0 };
    return {
      id: String(tech._id),
      name: tech.name,
      role: tech.role,
      total: s.total,
      done: s.done,
      refused: s.refused,
      ongoing: s.ongoing,
      score: s.score,
    };
  });
};

const executeBusinessLogic = async ({ intent, type, userId }) => {
  if (intent === "clarify") {
    return {
      intent,
      type,
      needsClarification: true,
      clarification: "Je n'ai pas compris. Voulez-vous : disponible, meilleur ou liste ?",
    };
  }

  switch (intent) {
    case "count": {
      const totalInterventions = await Intervention.countDocuments();
      return { intent, type, totalInterventions };
    }

    case "count_mine": {
      const mine = userId
        ? await Intervention.countDocuments({
            $or: [{ createdBy: userId }, { assignedTo: userId }],
          })
        : 0;
      return { intent, type, mine };
    }

    case "by_status": {
      const byStatus = await Intervention.aggregate([
        { $group: { _id: "$etat", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      return { intent, type, byStatus };
    }

    case "by_type": {
      const byType = await Intervention.aggregate([
        { $group: { _id: "$type", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      return { intent, type, byType };
    }

    case "overdue": {
      const now = new Date();
      const overdueCount = await Intervention.countDocuments({
        delai: { $lt: now },
        etat: { $ne: "TERMINEE" },
      });
      const samples = await Intervention.find({
        delai: { $lt: now },
        etat: { $ne: "TERMINEE" },
      })
        .sort({ delai: 1 })
        .limit(5)
        .select("name type etat delai");

      return { intent, type, overdueCount, samples };
    }

    case "summary": {
      const totalInterventions = await Intervention.countDocuments();
      const overdueCount = await Intervention.countDocuments({
        delai: { $lt: new Date() },
        etat: { $ne: "TERMINEE" },
      });
      return { intent, type, totalInterventions, overdueCount };
    }

    case "list":
    case "available":
    case "best":
    case "least_loaded":
    case "most_loaded": {
      const technicians = await getEnrichedTechnicians(type);
      if (!technicians.length) return { intent, type, technicians: [] };

      if (intent === "list") return { intent, type, technicians };

      if (intent === "available") {
        return {
          intent,
          type,
          technicians,
          available: technicians.filter((t) => t.ongoing <= 0),
        };
      }

      if (intent === "best") {
        const ranked = [...technicians].sort((a, b) => b.score - a.score || b.done - a.done || a.ongoing - b.ongoing);
        return { intent, type, technicians, best: ranked[0] || null };
      }

      if (intent === "least_loaded") {
        const ranked = [...technicians].sort((a, b) => a.ongoing - b.ongoing || a.total - b.total);
        return { intent, type, technicians, leastLoaded: ranked[0] || null };
      }

      const ranked = [...technicians].sort((a, b) => b.ongoing - a.ongoing || b.total - a.total);
      return { intent, type, technicians, mostLoaded: ranked[0] || null };
    }

    default:
      return {
        intent: "clarify",
        type,
        needsClarification: true,
        clarification: "Je n'ai pas compris. Voulez-vous : disponible, meilleur ou liste ?",
      };
  }
};

const buildConversationId = (req) => (req.user?.id ? String(req.user.id) : String(req.ip || "anonymous"));

const rememberConversation = (conversationId, role, content) => {
  const history = conversationMemory.get(conversationId) || [];
  history.push({ role, content, at: new Date().toISOString() });
  conversationMemory.set(conversationId, history.slice(-8));
};

const loadRecentDbHistory = async (userId) => {
  const query = userId ? { userId: String(userId) } : {};
  const rowsDesc = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(4).lean();
  const rows = [...rowsDesc].reverse();

  const history = [];
  rows.forEach((row) => {
    history.push({ role: "user", content: row.message, at: row.createdAt });
    history.push({ role: "assistant", content: row.response, at: row.createdAt });
  });

  return history;
};

const buildFinalPrompt = ({ message, data, memory }) => `
Tu es un assistant intelligent de gestion d'interventions d'un aeroport.

Tu dois:
- utiliser uniquement les donnees fournies
- repondre clairement et precisement
- ne jamais inventer

Historique recent:
${JSON.stringify(memory, null, 2)}

Question: ${message}
Donnees: ${JSON.stringify(data, null, 2)}
`;

const buildFallbackResponse = (data) => {
  if (data.needsClarification) return data.clarification;

  if (data.intent === "count") return `Le nombre total d'interventions est ${data.totalInterventions || 0}.`;
  if (data.intent === "count_mine") return `Vous avez ${data.mine || 0} intervention(s) liee(s) a votre compte.`;
  if (data.intent === "by_status") return `Statistiques par etat: ${(data.byStatus || []).map((i) => `${i._id || "NON_DEFINI"}: ${i.total}`).join(", ") || "Aucune donnee"}.`;
  if (data.intent === "by_type") return `Statistiques par type: ${(data.byType || []).map((i) => `${i._id || "AUTRE"}: ${i.total}`).join(", ") || "Aucune donnee"}.`;
  if (data.intent === "overdue") return `Interventions en retard: ${data.overdueCount || 0}.`;
  if (data.intent === "summary") return `Resume: total=${data.totalInterventions || 0}, retard=${data.overdueCount || 0}.`;

  if (!Array.isArray(data.technicians) || !data.technicians.length) return "Aucun technicien trouve pour ce filtre.";

  if (data.intent === "list") return `Liste des techniciens: ${data.technicians.map((t) => t.name).join(", ")}.`;
  if (data.intent === "available") {
    const available = data.available || [];
    return available.length
      ? `Technicien(s) disponible(s): ${available.map((t) => t.name).join(", ")}.`
      : "Aucun technicien disponible avec 0 intervention en cours.";
  }
  if (data.intent === "best") {
    return data.best
      ? `${data.best.name} est le meilleur technicien selon le score ${data.best.score}.`
      : "Aucun technicien classe.";
  }

  return "Je n'ai pas compris. Voulez-vous : disponible, meilleur ou liste ?";
};

exports.chatbot = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ message: "Le message est obligatoire." });

    const { intent: rawIntent, type: rawType } = detectIntent(message);
    const intent = rawIntent ? normalizeIntent(rawIntent) : null;
    const type = normalizeType(rawType);

    console.log("MESSAGE:", message);
    console.log("INTENT:", intent);
    console.log("TYPE:", type);

    if (!intent) {
      return res.status(200).json({
        reply: "Je n'ai pas compris. Voulez-vous : disponible, meilleur ou liste ?",
        message: "Je n'ai pas compris. Voulez-vous : disponible, meilleur ou liste ?",
      });
    }

    const model = getModel();
    const userId = req.user?.id ? String(req.user.id) : "admin";

    const data = await executeBusinessLogic({ intent, type, userId });

    const conversationId = buildConversationId(req);
    const memory = conversationMemory.get(conversationId) || [];
    const dbHistory = await loadRecentDbHistory(req.user?.id || null).catch(() => []);
    rememberConversation(conversationId, "user", message);

    let finalMessage = "";
    if (model && !data.needsClarification) {
      try {
        const mergedMemory = [...dbHistory, ...memory].slice(-8);
        const finalPrompt = buildFinalPrompt({ message, data, memory: mergedMemory });
        const final = await model.generateContent(finalPrompt);
        finalMessage = String(final?.response?.text?.() || "").trim();
      } catch (error) {
        finalMessage = "";
      }
    }

    if (!finalMessage) finalMessage = buildFallbackResponse(data);

    await ChatMessage.create({ userId, message, response: finalMessage });
    rememberConversation(conversationId, "assistant", finalMessage);

    return res.status(200).json({ message: finalMessage, intent, type, data });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur chatbot.", error: error.message });
  }
};

exports.chatbotHistory = async (req, res) => {
  try {
    const userId = req.user?.id ? String(req.user.id) : null;
    const query = userId ? { userId } : {};
    const history = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(10).lean();
    return res.status(200).json({ history });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur chatbot history.", error: error.message });
  }
};
