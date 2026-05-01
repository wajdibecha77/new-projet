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

const safeJsonParse = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch (secondError) {
      return null;
    }
  }
};

const normalizeIntent = (value) => {
  const intent = String(value || "").trim().toLowerCase();
  return SUPPORTED_INTENTS.includes(intent) ? intent : "clarify";
};

const normalizeType = (value) => {
  if (value === null) return null;
  const t = String(value || "").trim().toUpperCase();
  return SUPPORTED_TYPES.includes(t) ? t : null;
};

const analyzeIntentWithGemini = async (model, message) => {
  if (!model) {
    return { intent: "clarify", type: null, reason: "GEMINI_UNAVAILABLE" };
  }

  const analysisPrompt = `
Analyse cette question et retourne JSON uniquement.
Question utilisateur: "${message}"

Format strict:
{
  "intent": "best | available | list | count | count_mine | by_status | by_type | overdue | least_loaded | most_loaded | summary | clarify",
  "type": "mecanique | plomberie | electrique | informatique | autre | null"
}

Regles:
- best: meilleur / plus performant
- available: technicien disponible / zero intervention en cours
- list: liste des techniciens
- count: total des interventions
- count_mine: mes interventions
- by_status: stats par etat
- by_type: stats par type
- overdue: interventions en retard (delai depasse et pas terminee)
- least_loaded: technicien qui travaille le moins
- most_loaded: technicien le plus charge
- summary: resume global du systeme
- Si ambigu ou hors perimetre: clarify
- JSON uniquement, sans texte additionnel.
`;

  try {
    const analysis = await model.generateContent(analysisPrompt);
    const resultText = analysis?.response?.text?.() || "";
    const parsed = safeJsonParse(resultText);

    if (!parsed) return { intent: "clarify", type: null, reason: "PARSE_ERROR" };

    const intent = normalizeIntent(parsed.intent);
    const rawType = parsed.type === null ? null : parsed.type;
    const type = normalizeType(rawType ? String(rawType).toUpperCase() : null);

    return { intent, type, reason: "OK" };
  } catch (error) {
    return { intent: "clarify", type: null, reason: "MODEL_ERROR" };
  }
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
      clarification: "Pouvez-vous preciser votre demande ? Exemple: meilleur technicien electrique, liste plomberie, interventions en retard.",
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
      const byStatus = await Intervention.aggregate([
        { $group: { _id: "$etat", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      const byType = await Intervention.aggregate([
        { $group: { _id: "$type", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      return { intent, type, totalInterventions, overdueCount, byStatus, byType };
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
        clarification: "Question non couverte. Essayez: meilleur, disponible, liste, count, retard, stats.",
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
- comprendre EXACTEMENT la demande
- utiliser les donnees fournies
- ne jamais donner une reponse generique
- distinguer meilleur / liste / disponible / statistiques

Historique recent:
${JSON.stringify(memory, null, 2)}

Question: ${message}
Donnees: ${JSON.stringify(data, null, 2)}

Regles:
- Reponds clairement et precisement.
- Si question ambigue, demande une clarification courte.
- Si question en arabe, reponds en arabe simple ou bilingue arabe/francais.
- N'invente jamais des valeurs absentes des donnees.
`;

const buildFallbackResponse = (data) => {
  if (data.needsClarification) return data.clarification;

  if (data.intent === "count") return `Le nombre total d'interventions est ${data.totalInterventions || 0}.`;
  if (data.intent === "count_mine") return `Vous avez ${data.mine || 0} intervention(s) liee(s) a votre compte.`;
  if (data.intent === "by_status") return `Statistiques par etat: ${(data.byStatus || []).map((i) => `${i._id || "NON_DEFINI"}: ${i.total}`).join(", ") || "Aucune donnee"}.`;
  if (data.intent === "by_type") return `Statistiques par type: ${(data.byType || []).map((i) => `${i._id || "AUTRE"}: ${i.total}`).join(", ") || "Aucune donnee"}.`;
  if (data.intent === "overdue") return `Interventions en retard: ${data.overdueCount || 0}.`;
  if (data.intent === "summary") return `Resume: total=${data.totalInterventions || 0}, retard=${data.overdueCount || 0}.`;

  if (!Array.isArray(data.technicians) || !data.technicians.length) {
    return "Aucun technicien trouve pour ce filtre.";
  }

  if (data.intent === "list") return `Liste des techniciens: ${data.technicians.map((t) => t.name).join(", ")}.`;
  if (data.intent === "available") {
    const available = data.available || [];
    return available.length
      ? `Technicien(s) disponible(s): ${available.map((t) => t.name).join(", ")}.`
      : "Aucun technicien disponible avec 0 intervention en cours.";
  }
  if (data.intent === "best") return data.best ? `${data.best.name} est le meilleur technicien selon le score ${data.best.score}.` : "Aucun technicien classe.";
  if (data.intent === "least_loaded") return data.leastLoaded ? `${data.leastLoaded.name} travaille le moins (${data.leastLoaded.ongoing} en cours).` : "Aucune donnee.";
  if (data.intent === "most_loaded") return data.mostLoaded ? `${data.mostLoaded.name} est le plus charge (${data.mostLoaded.ongoing} en cours).` : "Aucune donnee.";

  return "Pouvez-vous reformuler votre demande ?";
};

exports.chatbot = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ message: "Le message est obligatoire." });

    const model = getModel();
    const userId = req.user?.id ? String(req.user.id) : "admin";

    const analysis = await analyzeIntentWithGemini(model, message);
    const data = await executeBusinessLogic({ intent: analysis.intent, type: analysis.type, userId });

    const conversationId = buildConversationId(req);
    const memory = conversationMemory.get(conversationId) || [];
    const dbHistory = await loadRecentDbHistory(req.user?.id || null).catch(() => []);
    rememberConversation(conversationId, "user", message);

    let finalMessage = "";
    if (model) {
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

    return res.status(200).json({ message: finalMessage, analysis, data });
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
