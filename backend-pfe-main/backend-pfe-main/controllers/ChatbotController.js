const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Intervention = require("../models/intervention");
const ChatMessage = require("../models/ChatMessage");

const SUPPORTED_TYPES = ["ELECTRIQUE", "PLOMBERIE", "MECANIQUE", null];
const SUPPORTED_INTENTS = [
  "find_technicien",
  "free_technicien",
  "best_technicien",
  "count_interventions",
  "least_working_technicien",
  "most_performant_technicien",
];
const TECHNICIAN_ROLES = ["TECHNICIEN", "ELECTRICIEN", "MECANICIEN", "PLOMBIER", "PLOMBERIE"];
const conversationMemory = new Map();

const TYPE_TO_ROLES = {
  ELECTRIQUE: ["ELECTRICIEN", "TECHNICIEN"],
  PLOMBERIE: ["PLOMBIER", "PLOMBERIE", "TECHNICIEN"],
  MECANIQUE: ["MECANICIEN", "TECHNICIEN"],
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

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

const detectTypeHeuristic = (message) => {
  const text = normalizeText(message);
  const electricKeywords = ["elect", "electric", "cable", "courant", "electrique"];
  const plomberieKeywords = ["plomb", "fuite", "robinet", "eau"];
  const mecaniqueKeywords = ["mecan", "moteur", "machine"];

  if (electricKeywords.some((k) => text.includes(normalizeText(k)))) return "ELECTRIQUE";
  if (plomberieKeywords.some((k) => text.includes(normalizeText(k)))) return "PLOMBERIE";
  if (mecaniqueKeywords.some((k) => text.includes(normalizeText(k)))) return "MECANIQUE";
  return null;
};

const detectIntentHeuristic = (message) => {
  const text = normalizeText(message);

  if (
    text.includes("combien") ||
    text.includes("nombre") ||
    text.includes("interventions")
  ) {
    return "count_interventions";
  }

  if (
    text.includes("0 intervention") ||
    text.includes("zero intervention") ||
    text.includes("disponible") ||
    text.includes("free")
  ) {
    return "free_technicien";
  }

  if (text.includes("travaille le moins") || text.includes("moins")) {
    return "least_working_technicien";
  }

  if (text.includes("plus performant") || text.includes("meilleur") || text.includes("best")) {
    return "best_technicien";
  }

  if (text.includes("technicien") || text.includes("technician")) {
    return "find_technicien";
  }

  return "find_technicien";
};

const analyzeIntent = async (model, message) => {
  const prompt = `
Analyse la question suivante (francais, arabe standard, arabe dialectal tunisien/algerien/marocain) et retourne uniquement un JSON valide.

Question: "${message}"

Format STRICT:
{
  "intent": "find_technicien | free_technicien | best_technicien | count_interventions | least_working_technicien | most_performant_technicien",
  "type": "ELECTRIQUE | PLOMBERIE | MECANIQUE | null"
}
`;

  if (!model) {
    return {
      intent: detectIntentHeuristic(message),
      type: detectTypeHeuristic(message),
      source: "fallback",
    };
  }

  try {
    const analysis = await model.generateContent(prompt);
    const resultText = analysis?.response?.text?.() || "";
    const parsed = safeJsonParse(resultText) || {};

    const intent = SUPPORTED_INTENTS.includes(parsed.intent)
      ? parsed.intent
      : detectIntentHeuristic(message);
    const type = SUPPORTED_TYPES.includes(parsed.type) ? parsed.type : detectTypeHeuristic(message);

    return { intent, type, source: "gemini" };
  } catch (error) {
    return {
      intent: detectIntentHeuristic(message),
      type: detectTypeHeuristic(message),
      source: "fallback",
    };
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

const buildBackendData = async (intent, type, userId) => {
  if (intent === "count_interventions") {
    const mine = userId
      ? await Intervention.countDocuments({
          $or: [{ createdBy: userId }, { assignedTo: userId }],
        })
      : 0;
    const total = await Intervention.countDocuments();
    return { intent, type, mine, total };
  }

  const techs = await getTechniciansByType(type);
  if (!techs.length) return { intent, type, techs: [], picked: null };

  const stats = await getStatsByTechnician(techs.map((t) => t._id));
  const enriched = techs.map((tech) => {
    const s = stats.get(String(tech._id)) || { total: 0, done: 0, refused: 0, ongoing: 0, score: 0 };
    return {
      id: tech._id,
      name: tech.name,
      role: tech.role,
      total: s.total,
      done: s.done,
      refused: s.refused,
      ongoing: s.ongoing,
      score: s.score,
    };
  });

  if (intent === "free_technicien") {
    const freeTechs = enriched.filter((t) => t.ongoing === 0);
    return { intent, type, techs: enriched, freeTechs, picked: freeTechs[0] || null };
  }

  if (intent === "least_working_technicien") {
    const sorted = [...enriched].sort((a, b) => a.ongoing - b.ongoing || a.total - b.total || a.name.localeCompare(b.name));
    return { intent, type, techs: enriched, picked: sorted[0] || null };
  }

  if (intent === "best_technicien" || intent === "most_performant_technicien") {
    const sorted = [...enriched].sort((a, b) => b.score - a.score || b.done - a.done || a.ongoing - b.ongoing);
    return { intent, type, techs: enriched, picked: sorted[0] || null };
  }

  const byAvailability = [...enriched].sort((a, b) => a.ongoing - b.ongoing || b.score - a.score);
  return { intent: "find_technicien", type, techs: enriched, picked: byAvailability[0] || null };
};

const buildFallbackResponse = (backendData) => {
  const { intent, picked, freeTechs, mine, total, type } = backendData;

  if (intent === "count_interventions") {
    return `Vous avez ${mine} intervention(s) liee(s) a votre compte. Total systeme: ${total}.`;
  }

  if (!backendData.techs || backendData.techs.length === 0) {
    return `Aucun technicien${type ? ` pour ${type.toLowerCase()}` : ""} n'a ete trouve.`;
  }

  if (intent === "free_technicien") {
    if (!freeTechs || freeTechs.length === 0) {
      return "Aucun technicien avec 0 intervention en cours actuellement.";
    }
    return `Technicien(s) disponible(s): ${freeTechs.map((t) => t.name).join(", ")}.`;
  }

  if (!picked) {
    return "Je n'ai pas pu determiner un technicien avec certitude.";
  }

  if (intent === "least_working_technicien") {
    return `${picked.name} travaille actuellement le moins (${picked.ongoing} intervention(s) en cours).`;
  }

  if (intent === "best_technicien" || intent === "most_performant_technicien") {
    return `${picked.name} est le plus performant selon le score (terminees - 2 x refusees) = ${picked.score}.`;
  }

  return `${picked.name} semble le plus disponible (${picked.ongoing} intervention(s) en cours).`;
};

const buildFinalPrompt = ({ message, backendData, memory }) => `
Tu es un assistant metier pour gestion d'interventions aeroportuaires.
Reponds en francais clair. Si la question etait en arabe, tu peux inclure une courte phrase arabe.

Historique recent:
${JSON.stringify(memory, null, 2)}

Question utilisateur:
${message}

Resultat backend fiable (JSON):
${JSON.stringify(backendData, null, 2)}

Contraintes:
- Ne jamais inventer des donnees absentes du JSON.
- Reponse professionnelle et concise.
- Si un technicien est propose, ajoute une suggestion: "Voulez-vous affecter ce technicien ?"
`;

const buildConversationId = (req) => {
  if (req.user?.id) return String(req.user.id);
  return req.ip || "anonymous";
};

const rememberConversation = (conversationId, role, content) => {
  const history = conversationMemory.get(conversationId) || [];
  history.push({ role, content, at: new Date().toISOString() });
  conversationMemory.set(conversationId, history.slice(-8));
};

const loadRecentDbHistory = async (userId) => {
  const query = userId ? { userId: String(userId) } : {};
  const rowsDesc = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();
  const rows = [...rowsDesc].reverse();

  const history = [];
  rows.forEach((row) => {
    history.push({ role: "user", content: row.message, at: row.createdAt });
    history.push({ role: "assistant", content: row.response, at: row.createdAt });
  });

  return history;
};

exports.chatbot = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Le message est obligatoire." });
    }

    const model = getModel();
    const analysis = await analyzeIntent(model, message);
    const backendData = await buildBackendData(analysis.intent, analysis.type, req.user?.id || null);

    const conversationId = buildConversationId(req);
    const memory = conversationMemory.get(conversationId) || [];
    let dbHistory = [];
    try {
      dbHistory = await loadRecentDbHistory(req.user?.id || null);
    } catch (error) {
      dbHistory = [];
    }
    rememberConversation(conversationId, "user", message);

    let finalMessage = "";
    let usedFallback = false;

    if (model) {
      try {
        const mergedMemory = [...dbHistory, ...memory].slice(-8);
        const finalPrompt = buildFinalPrompt({ message, backendData, memory: mergedMemory });
        const final = await model.generateContent(finalPrompt);
        finalMessage = String(final?.response?.text?.() || "").trim();
      } catch (error) {
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    if (!finalMessage) {
      usedFallback = true;
      finalMessage = buildFallbackResponse(backendData);
    }

    await ChatMessage.create({
      userId: req.user?.id ? String(req.user.id) : "admin",
      message,
      response: finalMessage,
    });

    rememberConversation(conversationId, "assistant", finalMessage);

    return res.status(200).json({
      message: finalMessage,
      intent: analysis.intent,
      type: analysis.type,
      fallback: usedFallback || analysis.source === "fallback",
      data: backendData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur chatbot.",
      error: error.message,
    });
  }
};

exports.chatbotHistory = async (req, res) => {
  try {
    const userId = req.user?.id ? String(req.user.id) : null;
    const query = userId ? { userId } : {};

    const history = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({ history });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur chatbot history.",
      error: error.message,
    });
  }
};
