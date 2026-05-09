/**
 * Report AI Analysis Service — v2 Premium
 * Uses Gemini AI to generate professional BI-grade insights.
 * Enhanced prompts for enterprise-level analysis.
 * Falls back gracefully if Gemini is unavailable.
 */

const { askGemini } = require("./geminiService");

/**
 * Analyze monthly stats with Gemini AI.
 * @param {Object} stats - Stats from reportStatsService
 * @returns {Promise<Object>} AI analysis
 */
async function analyzeWithAI(stats) {
  const prompt = buildProfessionalPrompt(stats);

  try {
    const raw = await askGemini(prompt);
    const parsed = extractJsonFromResponse(raw);

    if (parsed) {
      return { success: true, analysis: parsed, rawResponse: raw };
    }

    return {
      success: true,
      analysis: {
        resume: raw.slice(0, 1000),
        anomalies: [],
        zonesCritiques: [],
        tendances: [],
        recommandations: [],
        maintenancePreventive: [],
        surchargeTechniciens: "",
        performanceTechniciens: "",
        niveauUrgence: "NORMAL",
        niveauRisqueGlobal: "MODÉRÉ",
        scorePerformance: 70,
      },
      rawResponse: raw,
    };
  } catch (error) {
    console.error("[ReportAI] Gemini analysis failed:", error.message);
    return {
      success: false,
      analysis: buildFallbackAnalysis(stats),
      error: error.message,
    };
  }
}

function buildProfessionalPrompt(stats) {
  const { interventions: s, technicians: t, reclamations: r, period: p } = stats;

  const dailyTop = s.dailyCounts
    .map((c, i) => `Jour ${i + 1}: ${c}`)
    .filter((_, i) => s.dailyCounts[i] > 0)
    .slice(0, 15)
    .join(", ");

  const techRanking = t.ranking
    .map((tech) => `${tech.name}: ${tech.terminee}/${tech.total} (${tech.scorePercent}%)`)
    .join(", ");

  return [
    "Tu es un analyste Business Intelligence senior spécialisé en gestion de maintenance aéroportuaire.",
    `Tu analyses le rapport mensuel de ${p.monthLabel} pour TAV Airports.`,
    "Génère une analyse professionnelle, précise et orientée décision pour la direction.",
    "",
    `=== RAPPORT MENSUEL ${p.monthLabel.toUpperCase()} ===`,
    `Période: ${p.startDate} au ${p.endDate} (${p.daysInMonth} jours, ${p.currentDay} jours écoulés)`,
    "",
    "--- INTERVENTIONS ---",
    `Total ce mois: ${s.total} interventions`,
    `Terminées: ${s.byStatus.TERMINEE} | En cours: ${s.byStatus.EN_COURS} | Non affectées: ${s.nonAffecteeCount}`,
    `Urgentes/Critiques: ${s.urgentCount} | Taux résolution: ${s.resolutionRate}%`,
    `Moyenne quotidienne: ${s.avgPerDay}/jour`,
    s.peakDay ? `Jour le plus chargé: Jour ${s.peakDay} (${s.peakDayCount} interventions)` : "",
    "",
    "--- CATÉGORIES ---",
    `Électrique: ${s.byType.ELECTRIQUE} | Informatique: ${s.byType.INFORMATIQUE} | Mécanique: ${s.byType.MECANIQUE} | Plomberie: ${s.byType.PLOMBERIE} | Autre: ${s.byType.AUTRE}`,
    "",
    "--- ÉVOLUTION QUOTIDIENNE (extraits) ---",
    dailyTop || "Données insuffisantes",
    "",
    "--- ZONES PROBLÉMATIQUES ---",
    s.topLocations.map((l) => `${l.lieu}: ${l.count}`).join(" | ") || "Aucune zone identifiée",
    "",
    "--- TECHNICIENS ---",
    t.technicianOfMonth ? `Technicien du mois: ${t.technicianOfMonth.name} (${t.technicianOfMonth.terminee} terminées, score ${t.technicianOfMonth.scorePercent}%)` : "Aucun technicien assigné",
    `Classement: ${techRanking || "N/A"}`,
    "",
    "--- RÉCLAMATIONS ---",
    `Total ce mois: ${r.total} | En attente: ${r.enAttente} | Acceptées: ${r.acceptee} | Refusées: ${r.refusee}`,
    "",
    "Retourne UNIQUEMENT un objet JSON valide (sans markdown) avec cette structure:",
    "{",
    '  "resume": "Résumé exécutif professionnel de 3-4 phrases pour la direction",',
    '  "anomalies": ["anomalie critique 1 avec impact", "anomalie 2"],',
    '  "zonesCritiques": ["zone 1: description et risque", "zone 2"],',
    '  "tendances": ["tendance observée 1", "tendance 2"],',
    '  "recommandations": ["action prioritaire 1", "action 2", "action 3"],',
    '  "maintenancePreventive": ["maintenance 1 recommandée", "maintenance 2"],',
    '  "surchargeTechniciens": "Évaluation de la charge de travail des techniciens",',
    '  "performanceTechniciens": "Analyse performance équipe ce mois",',
    '  "niveauUrgence": "CRITIQUE|ELEVE|MODERE|NORMAL",',
    '  "niveauRisqueGlobal": "ÉLEVÉ|MODÉRÉ|FAIBLE",',
    '  "scorePerformance": 0-100',
    "}",
    "",
    "Sois précis, professionnel, en français. Ne retourne aucun texte hors du JSON.",
  ].join("\n");
}

function extractJsonFromResponse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  // Try to extract JSON block
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Try cleaning common issues
    try {
      const cleaned = jsonMatch[0]
        .replace(/,(\s*[}\]])/g, "$1") // trailing commas
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " "); // control chars
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function buildFallbackAnalysis(stats) {
  const { interventions: s, technicians: t, reclamations: r, period: p } = stats;

  const dominantType = Object.entries(s.byType).sort((a, b) => b[1] - a[1])[0];
  const recommandations = [];

  if (s.nonAffecteeCount > 0)
    recommandations.push(`${s.nonAffecteeCount} interventions non affectées — affecter immédiatement.`);
  if (s.resolutionRate < 60)
    recommandations.push("Taux de résolution insuffisant — réviser le processus d'affectation.");
  if (s.urgentCount > 3)
    recommandations.push(`${s.urgentCount} interventions urgentes — prioriser les ressources.`);
  if (r.enAttente > 2)
    recommandations.push(`${r.enAttente} réclamations en attente — traitement urgent requis.`);
  if (recommandations.length === 0)
    recommandations.push("Maintenir le niveau de performance actuel.");

  return {
    resume: `Pour ${p.monthLabel}, ${s.total} interventions ont été enregistrées avec un taux de résolution de ${s.resolutionRate}%. ${s.urgentCount} cas urgents ont nécessité une attention prioritaire. La catégorie dominante est ${dominantType ? dominantType[0] : "non identifiée"} avec ${dominantType ? dominantType[1] : 0} interventions.`,
    anomalies: s.nonAffecteeCount > 5 ? [`${s.nonAffecteeCount} interventions non affectées — surcharge opérationnelle possible.`] : [],
    zonesCritiques: s.topLocations.slice(0, 3).map((l) => `${l.lieu}: ${l.count} intervention(s)`),
    tendances: [`Moyenne de ${s.avgPerDay} interventions par jour ce mois.`],
    recommandations,
    maintenancePreventive: ["Vérification préventive des équipements les plus sollicités."],
    surchargeTechniciens: t.ranking.length > 0
      ? `${t.ranking.length} techniciens actifs ce mois. ${t.technicianOfMonth ? t.technicianOfMonth.name + " est le plus performant." : ""}`
      : "Aucun technicien assigné ce mois.",
    performanceTechniciens: t.technicianOfMonth
      ? `${t.technicianOfMonth.name} — ${t.technicianOfMonth.terminee} interventions terminées sur ${t.technicianOfMonth.total} (${t.technicianOfMonth.scorePercent}%).`
      : "Données de performance insuffisantes.",
    niveauUrgence: s.urgentCount > 10 ? "ELEVE" : s.urgentCount > 3 ? "MODERE" : "NORMAL",
    niveauRisqueGlobal: s.resolutionRate < 50 ? "ÉLEVÉ" : s.resolutionRate < 75 ? "MODÉRÉ" : "FAIBLE",
    scorePerformance: s.resolutionRate,
  };
}

module.exports = { analyzeWithAI };
