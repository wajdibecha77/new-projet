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
  "compare",
  "recurring_problem",
  "overload",
  "analysis",
  "clarify",
];

const SUPPORTED_TYPES = ["ELECTRIQUE", "PLOMBERIE", "MECANIQUE", "INFORMATIQUE", "AUTRE", null];
const TECHNICIAN_ROLES = ["TECHNICIEN", "ELECTRICIEN", "MECANICIEN", "PLOMBIER", "PLOMBERIE", "INFORMATICIEN", "INFORMATIQUE"];

const TYPE_TO_ROLES = {
  ELECTRIQUE: ["ELECTRICIEN", "TECHNICIEN"],
  PLOMBERIE: ["PLOMBIER", "PLOMBERIE", "TECHNICIEN"],
  MECANIQUE: ["MECANICIEN", "TECHNICIEN"],
  INFORMATIQUE: ["INFORMATICIEN", "INFORMATIQUE", "TECHNICIEN"],
  AUTRE: ["TECHNICIEN"],
};

const conversationMemory = new Map();

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const containsAny = (text, keywords) => keywords.some((k) => text.includes(k));

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

function detectIntent(message) {
  const text = normalizeText(message);

  let intent = null;
  let type = null;

  const typeRules = [
    {
      key: "PLOMBERIE",
      words: [
        "plomb", "plomberie", "plombier", "fuite", "robinet", "canalisation",
        "tuyau", "evier", "lavabo", "wc", "toilette", "eau", "drain", "egout",
        "chauffe eau", "ballon", "sanitaire", "siphon", "vanne", "pression eau",
        "pompe eau", "chasse eau", "mitigeur", "joint", "jointure", "colmatage",
        "debouchage", "bouchon", "infiltration", "humidite", "goutte", "goutte a goutte",
        "reservoir", "cuve", "distribution eau", "alimentation eau", "conduite", "eaux usees",
        "eaux pluviales", "raccord", "raccordement", "wc bouche", "evacuation", "debit eau",
        "plafond humide", "fuite plafond", "odeur egout", "robinetterie", "salle de bain"
      ],
    },
    {
      key: "ELECTRIQUE",
      words: [
        "elect", "electrique", "electricite", "electricien", "cable", "courant",
        "prise", "tableau electrique", "disjoncteur", "ampoule", "lumier", "court circuit",
        "panne courant", "coupure", "surtension", "basse tension", "haute tension", "fusible",
        "interrupteur", "contacteur", "transformateur", "onduleur", "generateur", "groupe electrogene",
        "eclairage", "neon", "spot", "projecteur", "lampe", "phase", "neutre", "terre",
        "mise a la terre", "arc electrique", "etincelle", "brulure cable", "cable fondu", "armoire electrique",
        "borne", "rallonge", "triphase", "monophase", "compteur", "consommation", "panne electrique",
        "circuit", "ligne electrique", "boite derivation", "protection electrique", "prise brulee"
      ],
    },
    {
      key: "MECANIQUE",
      words: [
        "mecan", "mecanique", "mecanicien", "moteur", "machine", "pompe",
        "compresseur", "courroie", "roulement", "vibration", "frein", "piston",
        "embrayage", "boite vitesse", "engrenage", "axe", "palier", "joint mecanique",
        "frottement", "surchauffe", "temperature moteur", "huile", "graissage", "lubrification",
        "bruit moteur", "claquement", "rotation", "turbine", "ventilateur", "helice",
        "poulie", "chassis", "suspension", "alignement", "desalignement", "usure",
        "maintenance mecanique", "maintenance preventive", "maintenance corrective", "demarrage difficile",
        "arrete machine", "blocage", "grippage", "pression mecanique", "deformation", "piece casse",
        "fuite huile", "niveau huile", "pompe hydraulique", "verin", "hydraulique", "pneumatique"
      ],
    },
    {
      key: "INFORMATIQUE",
      words: [
        "info", "informat", "informatique", "informaticien", "it", "reseau",
        "ordinateur", "pc", "serveur", "switch", "routeur", "wifi", "internet",
        "logiciel", "application", "systeme", "imprimante", "scanner", "camera",
        "bug", "erreur", "ecran bleu", "lenteur", "plantage", "crash", "base de donnees",
        "bdd", "sql", "mongodb", "api", "backend", "frontend", "authentification", "mot de passe",
        "compte bloque", "compte", "session", "token", "dns", "ip", "lan", "wan", "vpn",
        "pare feu", "firewall", "antivirus", "malware", "mise a jour", "update", "driver",
        "pilote", "windows", "linux", "mac", "navigateur", "email", "messagerie", "outlook",
        "gmail", "cloud", "stockage", "fichier corrompu", "partage reseau", "camera ip"
      ],
    },
  ];

  let bestType = null;
  let bestTypeScore = 0;
  typeRules.forEach((rule) => {
    const score = rule.words.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0);
    if (score > bestTypeScore) {
      bestTypeScore = score;
      bestType = rule.key;
    }
  });
  type = bestTypeScore > 0 ? bestType : null;

  const intentRules = [
    { key: "best", words: ["meilleur", "plus performant", "best", "ahsen", "ahsan"] },
    { key: "available", words: ["disponible", "free", "moins charge", "0 intervention"] },
    { key: "list", words: ["liste", "list", "tous", "tout les techniciens"] },
    { key: "count", words: ["combien", "9adeh", "nombre", "total"] },
    { key: "compare", words: ["compar", "versus", "vs"] },
    { key: "recurring_problem", words: ["recurrent", "repete", "frequent", "souvent"] },
    { key: "overload", words: ["surcharge", "charge elevee", "trop de taches", "charge"] },
    { key: "analysis", words: ["analyse", "analyser", "diagnostic"] },
    { key: "overdue", words: ["retard", "overdue", "delai depasse"] },
    { key: "by_status", words: ["etat", "status", "statut"] },
    { key: "by_type", words: ["type"] },
    { key: "summary", words: ["resume", "summary", "global"] },
  ];

  let bestScore = 0;
  intentRules.forEach((rule) => {
    const score = rule.words.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      intent = rule.key;
    }
  });

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
      const byStatus = await Intervention.aggregate([
        { $group: { _id: "$etat", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      return { intent, type, totalInterventions, overdueCount, byStatus };
    }

    case "analysis": {
      const totalInterventions = await Intervention.countDocuments();
      const overdueCount = await Intervention.countDocuments({
        delai: { $lt: new Date() },
        etat: { $ne: "TERMINEE" },
      });
      const byStatus = await Intervention.aggregate([
        { $group: { _id: "$etat", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      const technicians = await getEnrichedTechnicians(type);
      const overloaded = technicians.filter((t) => t.ongoing >= 4);
      return { intent, type, totalInterventions, overdueCount, byStatus, overloaded };
    }

    case "overload": {
      const technicians = await getEnrichedTechnicians(type);
      const overloaded = technicians.filter((t) => t.ongoing >= 4).sort((a, b) => b.ongoing - a.ongoing);
      const leastLoaded = [...technicians].sort((a, b) => a.ongoing - b.ongoing)[0] || null;
      return { intent, type, technicians, overloaded, leastLoaded };
    }

    case "recurring_problem": {
      const recurring = await Intervention.aggregate([
        {
          $group: {
            _id: {
              type: "$type",
              lieu: "$lieu",
              description: { $toLower: "$description" },
            },
            total: { $sum: 1 },
          },
        },
        { $match: { total: { $gte: 2 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]);
      return { intent, type, recurring };
    }

    case "compare": {
      const technicians = await getEnrichedTechnicians(type);
      const byPerformance = [...technicians].sort((a, b) => b.score - a.score || b.done - a.done).slice(0, 3);
      const byLoad = [...technicians].sort((a, b) => b.ongoing - a.ongoing || b.total - a.total).slice(0, 3);
      return { intent, type, technicians, byPerformance, byLoad };
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
        const sortedByLoad = [...technicians].sort((a, b) => a.ongoing - b.ongoing || a.total - b.total);
        const minLoad = sortedByLoad.length ? sortedByLoad[0].ongoing : 0;
        const leastLoaded = sortedByLoad.filter((t) => t.ongoing === minLoad);
        const selected = leastLoaded.length
          ? leastLoaded[Math.floor(Math.random() * leastLoaded.length)]
          : null;

        return {
          intent,
          type,
          technicians,
          available: technicians.filter((t) => t.ongoing <= 0),
          minLoad,
          leastLoaded,
          selected,
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
Tu es un Assistant Admin Intelligent (decision support system) pour la gestion des interventions aeroport.

Tu dois:
- utiliser uniquement les donnees fournies
- comprendre francais, arabe dialectal, ou mixte
- repondre clairement et precisement
- ne jamais inventer
- proposer une action concrete pour l'admin

Historique recent:
${JSON.stringify(memory, null, 2)}

Question: ${message}
Donnees: ${JSON.stringify(data, null, 2)}

Format obligatoire:
1) Reponse principale
2) Analyse (avec coches: )
3) Recommandation (commence par:  Recommandation :)
`;

const buildFallbackResponse = (data) => {
  if (data.needsClarification) return data.clarification;

  if (data.intent === "count") return `Reponse principale:\nTotal interventions: ${data.totalInterventions || 0}.\n\nAnalyse:\n Donnee issue du comptage global MongoDB.\n\n Recommandation : Surveillez les pics et planifiez la capacite technicien.`; 
  if (data.intent === "count_mine") return `Reponse principale:\nVous avez ${data.mine || 0} intervention(s) liee(s) a votre compte.\n\nAnalyse:\n Comptage sur createdBy/assignedTo.\n\n Recommandation : Prioriser vos interventions critiques.`;
  if (data.intent === "by_status") return `Reponse principale:\nStatistiques par etat disponibles.\n\nAnalyse:\n ${(data.byStatus || []).map((i) => `${i._id || "NON_DEFINI"}: ${i.total}`).join(" | ") || "Aucune donnee"}\n\n Recommandation : Reduire les statuts bloquants en priorite.`;
  if (data.intent === "by_type") return `Reponse principale:\nStatistiques par type disponibles.\n\nAnalyse:\n ${(data.byType || []).map((i) => `${i._id || "AUTRE"}: ${i.total}`).join(" | ") || "Aucune donnee"}\n\n Recommandation : Renforcer l'equipe sur le type dominant.`;
  if (data.intent === "overdue") return `Reponse principale:\nInterventions en retard: ${data.overdueCount || 0}.\n\nAnalyse:\n Retards calcules sur delai < maintenant et etat != TERMINEE.\n\n Recommandation : Reaffecter immediatement les tickets en retard.`;
  if (data.intent === "summary") return `Reponse principale:\nResume global du systeme pret.\n\nAnalyse:\n Total: ${data.totalInterventions || 0}\n Retard: ${data.overdueCount || 0}\n\n Recommandation : Concentrer les ressources sur le backlog et les retards.`;
  if (data.intent === "analysis") {
    const overloadedCount = Array.isArray(data.overloaded) ? data.overloaded.length : 0;
    return `Reponse principale:\nAnalyse globale effectuee.\n\nAnalyse:\n Total: ${data.totalInterventions || 0}\n Retard: ${data.overdueCount || 0}\n Techniciens surcharges: ${overloadedCount}\n\n Recommandation : Redistribuer les nouvelles taches vers les moins charges.`;
  }
  if (data.intent === "recurring_problem") {
    const top = (data.recurring || [])[0];
    return `Reponse principale:\nProblemes recurrents detectes.\n\nAnalyse:\n Nombre de cas recurrents: ${(data.recurring || []).length}\n${top ? ` Cas principal: ${top._id?.description || "N/A"} (${top.total})` : " Aucun cas >= 2 occurrences"}\n\n Recommandation : Traiter la cause racine du probleme le plus frequent.`;
  }
  if (data.intent === "compare") {
    const p = (data.byPerformance || []).map((t) => `${t.name}(${t.score})`).join(", ") || "Aucun";
    const l = (data.byLoad || []).map((t) => `${t.name}(${t.ongoing})`).join(", ") || "Aucun";
    return `Reponse principale:\nComparaison techniciens terminee.\n\nAnalyse:\n Top performance: ${p}\n Top charge: ${l}\n\n Recommandation : Affecter les nouvelles interventions aux techniciens performants avec charge faible.`;
  }
  if (data.intent === "overload") {
    const overloaded = data.overloaded || [];
    const target = data.leastLoaded || null;
    return `Reponse principale:\nSurcharge technicien analysee.\n\nAnalyse:\n Techniciens surcharges: ${overloaded.length}\n Candidat faible charge: ${target ? `${target.name} (${target.ongoing})` : "Aucun"}\n\n Recommandation : Redistribuer les taches surchargees vers ${target ? target.name : "les techniciens les moins charges"}.`;
  }

  if (!Array.isArray(data.technicians) || !data.technicians.length) return "Aucun technicien trouve pour ce filtre.";

  if (data.intent === "list") return `Reponse principale:\nListe des techniciens.\n\nAnalyse:\n ${data.technicians.map((t) => `${t.name} (${t.role})`).join(" | ")}\n\n Recommandation : Selectionner ensuite par specialite et charge.`;
  if (data.intent === "available") {
    const selected = data.selected || null;
    if (selected) {
      return `Reponse principale:\n${selected.name} est le technicien le plus disponible actuellement.\n\nAnalyse:\n ${selected.ongoing} intervention(s) en cours\n Charge minimale sur les techniciens filtres\n\n Recommandation : Affecter cette intervention a ${selected.name} pour equilibrer la charge.`;
    }
    return "Reponse principale:\nAucun technicien ne correspond au filtre.\n\nAnalyse:\n Liste techniciens vide pour ce domaine.\n\n Recommandation : Verifier la specialite demandee ou les roles des utilisateurs.";
  }
  if (data.intent === "best") {
    return data.best
      ? `Reponse principale:\n${data.best.name} est le meilleur technicien.\n\nAnalyse:\n Score: ${data.best.score}\n Terminees: ${data.best.done}\n Refusees: ${data.best.refused}\n Charge actuelle: ${data.best.ongoing}\n\n Recommandation : Vous pouvez lui affecter une intervention prioritaire.`
      : "Reponse principale:\nAucun technicien classe.\n\nAnalyse:\n Donnees insuffisantes pour calcul de performance.\n\n Recommandation : Verifier les statuts TERMINEE/REFUSEE.";
  }

  return "Choisissez une analyse: meilleur technicien, technicien disponible, liste techniciens, statistiques, comparaison, probleme recurrent, surcharge.";
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
        reply: "Choisissez une analyse: meilleur technicien, technicien disponible, liste techniciens, statistiques, comparaison, probleme recurrent, surcharge.",
        message: "Choisissez une analyse: meilleur technicien, technicien disponible, liste techniciens, statistiques, comparaison, probleme recurrent, surcharge.",
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
