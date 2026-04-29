const path = require("path");
const { analyzeIncidentImage, detectType, detectUrgence } = require("../services/geminiService");

const TYPE_BY_CATEGORY = {
  RESEAU: "INFORMATIQUE",
  MATERIEL: "INFORMATIQUE",
  LOGICIEL: "INFORMATIQUE",
  ELECTRICITE: "ELECTRIQUE",
  PLOMBERIE: "PLOMBERIE",
  MECANIQUE: "MECANIQUE",
  AUTRE: "AUTRE",
};

const normalizeTypeIntervention = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  return TYPE_BY_CATEGORY[raw] || (["ELECTRIQUE", "INFORMATIQUE", "MECANIQUE", "PLOMBERIE", "AUTRE"].includes(raw) ? raw : "AUTRE");
};

const normalizeUrgence = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "CRITIQUE") return "CRITIQUE";
  if (raw === "URGENT") return "URGENT";
  return "NORMAL";
};

const enrichPublicReclamationWithAI = async (req, _res, next) => {
  try {
    const description = String(req.body?.description || "").trim();
    const userType = String(req.body?.typeIntervention || "").trim();
    const firstImage = (req.files || []).find((file) => String(file.mimetype || "").startsWith("image/"));

    let detectedType = normalizeTypeIntervention(userType);
    let detectedUrgence = "NORMAL";

    if (firstImage?.path) {
      const imageAi = await analyzeIncidentImage({
        imagePath: path.resolve(firstImage.path),
        mimeType: firstImage.mimetype,
      });

      if (imageAi?.type) detectedType = normalizeTypeIntervention(imageAi.type);
      if (imageAi?.urgence) detectedUrgence = normalizeUrgence(imageAi.urgence);
    }

    if (detectedType === "AUTRE" && description) {
      detectedType = normalizeTypeIntervention(await detectType(description));
    }

    if (detectedUrgence === "NORMAL" && description) {
      detectedUrgence = normalizeUrgence(await detectUrgence(description));
    }

    req.body.typeIntervention = detectedType;
    req.body.aiUrgence = detectedUrgence;

    return next();
  } catch (error) {
    return next();
  }
};

module.exports = {
  enrichPublicReclamationWithAI,
};
