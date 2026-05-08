/**
 * Report AI Analysis Service
 * Uses Gemini AI (via existing geminiService) to analyze intervention statistics
 * and generate intelligent insights for the PDF report.
 * This is a NEW file — does NOT modify any existing logic.
 */

const { askGemini } = require("./geminiService");

/**
 * Analyze report statistics using Gemini AI and return structured insights.
 * @param {Object} stats - The stats object from reportStatsService.gatherReportStats()
 * @returns {Promise<Object>} AI analysis object
 */
async function analyzeWithAI(stats) {
  const prompt = buildAnalysisPrompt(stats);

  try {
    const raw = await askGemini(prompt);
    const parsed = extractJsonFromResponse(raw);

    if (parsed) {
      return {
        success: true,
        analysis: parsed,
        rawResponse: raw,
      };
    }

    // If JSON parsing fails, return the raw text as a summary
    return {
      success: true,
      analysis: {
        resume: raw.slice(0, 2000),
        anomalies: [],
        zonesCritiques: [],
        tendances: [],
        recommandations: [],
        performanceTechniciens: "",
        niveauUrgence: "NORMAL",
        maintenancePreventive: [],
      },
      rawResponse: raw,
    };
  } catch (error) {
    console.error("[ReportAI] Gemini analysis failed:", error.message);
    return {
      success: false,
      analysis: generateFallbackAnalysis(stats),
      error: error.message,
    };
  }
}

function buildAnalysisPrompt(stats) {
  const { interventions, technicians, reclamations } = stats;

  return [
    "Tu es un analyste IA expert en gestion de maintenance aeroportuaire pour TAV Airports.",
    "Analyse les statistiques suivantes et genere un rapport d'analyse intelligent.",
    "",
    "=== STATISTIQUES INTERVENTIONS ===",
    `Total interventions: ${interventions.total}`,
    `Par type: Electrique=${interventions.byType.ELECTRIQUE}, Informatique=${interventions.byType.INFORMATIQUE}, Mecanique=${interventions.byType.MECANIQUE}, Plomberie=${interventions.byType.PLOMBERIE}, Autre=${interventions.byType.AUTRE}`,
    `Par statut: Terminee=${interventions.byStatus.TERMINEE}, En cours=${interventions.byStatus.EN_COURS}, Non affectee=${interventions.byStatus.NON_AFFECTEE}, Assignee=${interventions.byStatus.ASSIGNEE}, Refusee=${interventions.byStatus.REFUSEE}`,
    `Interventions urgentes: ${interventions.urgentCount}`,
    `Taux de resolution global: ${interventions.resolutionRate}%`,
    `Ce mois: ${interventions.thisMonth.total} interventions (terminee: ${interventions.thisMonth.terminee}, en cours: ${interventions.thisMonth.enCours})`,
    `Evolution mensuelle: ${interventions.monthlyEvolution.join(", ")}`,
    `Zones les plus problematiques: ${interventions.topLocations.map((l) => l.lieu + " (" + l.count + ")").join(", ") || "Aucune"}`,
    "",
    "=== TECHNICIENS ===",
    technicians.topTechnician
      ? `Meilleur technicien: ${technicians.topTechnician.name} (${technicians.topTechnician.terminee} terminees sur ${technicians.topTechnician.total})`
      : "Aucun technicien enregistre",
    `Classement: ${technicians.ranking.map((t) => t.name + ": " + t.terminee + "/" + t.total).join(", ") || "N/A"}`,
    "",
    "=== RECLAMATIONS ===",
    `Total: ${reclamations.total}, En attente: ${reclamations.enAttente}, Acceptee: ${reclamations.acceptee}, Refusee: ${reclamations.refusee}`,
    "",
    "Retourne UNIQUEMENT un JSON valide avec cette structure exacte:",
    "{",
    '  "resume": "Resume professionnel en 3-4 phrases",',
    '  "anomalies": ["anomalie 1", "anomalie 2"],',
    '  "zonesCritiques": ["zone 1 avec explication", "zone 2"],',
    '  "tendances": ["tendance 1", "tendance 2"],',
    '  "recommandations": ["recommandation 1", "recommandation 2", "recommandation 3"],',
    '  "performanceTechniciens": "Analyse courte des performances",',
    '  "niveauUrgence": "CRITIQUE | ELEVE | MODERE | NORMAL",',
    '  "maintenancePreventive": ["suggestion 1", "suggestion 2"]',
    "}",
    "",
    "Sois precis, professionnel et actionnable. Ecris en francais.",
    "Ne retourne aucun texte hors JSON.",
  ].join("\n");
}

function extractJsonFromResponse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  try {
    return JSON.parse(raw.slice(first, last + 1));
  } catch {
    return null;
  }
}

function generateFallbackAnalysis(stats) {
  const { interventions, technicians } = stats;
  const resume = `Le systeme compte ${interventions.total} interventions dont ${interventions.byStatus.TERMINEE} terminees (taux de resolution: ${interventions.resolutionRate}%). ${interventions.urgentCount} interventions sont classees urgentes ou critiques.`;

  const recommandations = [];
  if (interventions.nonAffecteeCount > 0) {
    recommandations.push(
      `${interventions.nonAffecteeCount} interventions non affectees necessitent une attention immediate.`
    );
  }
  if (interventions.resolutionRate < 50) {
    recommandations.push(
      "Le taux de resolution est inferieur a 50%. Une revision des processus est recommandee."
    );
  }
  if (interventions.urgentCount > 5) {
    recommandations.push(
      "Le nombre d'interventions urgentes est eleve. Priorisez les affectations."
    );
  }

  return {
    resume,
    anomalies: [],
    zonesCritiques: interventions.topLocations.map(
      (l) => `${l.lieu}: ${l.count} interventions`
    ),
    tendances: [],
    recommandations,
    performanceTechniciens: technicians.topTechnician
      ? `Meilleur technicien: ${technicians.topTechnician.name} avec ${technicians.topTechnician.terminee} interventions terminees.`
      : "Aucun technicien enregistre.",
    niveauUrgence: interventions.urgentCount > 10 ? "ELEVE" : "MODERE",
    maintenancePreventive: [],
  };
}

module.exports = { analyzeWithAI };
