const { GoogleGenerativeAI } = require("@google/generative-ai");

const ALLOWED_TYPES = ["ELECTRIQUE", "INFORMATIQUE", "MECANIQUE", "PLOMBERIE", "AUTRE"];
const ALLOWED_URGENCE = ["CRITIQUE", "URGENT", "NORMAL"];

const cleanAIText = (text) =>
  String(text || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");

const extractTypeFromText = (text) => {
  if (text.includes("ELECTRIQUE")) return "ELECTRIQUE";
  if (text.includes("INFORMATIQUE")) return "INFORMATIQUE";
  if (text.includes("MECANIQUE")) return "MECANIQUE";
  if (text.includes("PLOMBERIE")) return "PLOMBERIE";
  return "AUTRE";
};

const fallbackType = (description) => {
  const text = String(description || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (text.includes("fil") || text.includes("elect") || text.includes("courant")) {
    return "ELECTRIQUE";
  }

  if (text.includes("pc") || text.includes("ordinateur") || text.includes("logiciel")) {
    return "INFORMATIQUE";
  }

  if (text.includes("moteur") || text.includes("machine")) {
    return "MECANIQUE";
  }

  if (text.includes("eau") || text.includes("fuite") || text.includes("robinet")) {
    return "PLOMBERIE";
  }

  return "AUTRE";
};

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

const askGemini = async (prompt) => {
  const model = getModel();
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  return result?.response?.text?.() || "";
};

const detectType = async (description) => {
  try {
    const safeDescription = String(description || "").trim();
    if (!safeDescription) return "AUTRE";

    const prompt =
      "Tu es un classificateur automatique.\n\n" +
      "Reponds STRICTEMENT par UN MOT en majuscule parmi :\n" +
      "ELECTRIQUE, INFORMATIQUE, MECANIQUE, PLOMBERIE, AUTRE\n\n" +
      "Regles :\n" +
      "* Aucune phrase\n" +
      "* Aucun texte supplementaire\n" +
      "* Une seule reponse\n\n" +
      `Description: ${safeDescription}`;

    const raw = await askGemini(prompt);
    const cleaned = cleanAIText(raw);
    const aiType = extractTypeFromText(cleaned);
    const finalType = aiType === "AUTRE" ? fallbackType(safeDescription) : aiType;

    console.log("AI RAW:", raw);
    console.log("AI CLEAN:", cleaned);
    console.log("FINAL TYPE:", finalType);
    return finalType;
  } catch (error) {
    console.error("[AI][detectType] error=", error.message);
    const finalType = fallbackType(description);
    console.log("FINAL TYPE:", finalType);
    return finalType;
  }
};

const detectUrgence = async (description) => {
  try {
    const safeDescription = String(description || "").trim();
    if (!safeDescription) return "NORMAL";

    const prompt = [
      "Tu detectes l'urgence d'une reclamation de maintenance.",
      "Reponds avec un seul mot EXACT parmi : CRITIQUE, URGENT, NORMAL.",
      "N'ajoute aucune explication.",
      `Description: ${safeDescription}`,
    ].join("\n");

    const raw = await askGemini(prompt);
    const candidate = normalizeChoice(raw.split(/\s+/)[0]);
    const detected = ALLOWED_URGENCE.includes(candidate) ? candidate : "NORMAL";

    console.log("[AI][detectUrgence] raw=", raw, "detected=", detected);
    return detected;
  } catch (error) {
    console.error("[AI][detectUrgence] error=", error.message);
    return "NORMAL";
  }
};

module.exports = {
  detectType,
  detectUrgence,
};
