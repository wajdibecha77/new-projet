/**
 * Report Statistics Service
 * Aggregates intervention & reclamation data from MongoDB for report generation.
 * This is a NEW file — does NOT modify any existing logic.
 */

const Intervention = require("../models/intervention");
const Reclamation = require("../models/Reclamation");
const User = require("../models/User");

const TECHNICIAN_ROLES = [
  "INFORMATICIEN",
  "ELECTRICIEN",
  "MECANICIEN",
  "PLOMBERIE",
  "PLOMBIER",
  "TECHNICIEN",
];

const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

/**
 * Gather all statistics needed for the report.
 * @returns {Promise<Object>} stats object
 */
async function gatherReportStats() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ── Interventions ──
  const interventions = await Intervention.find({})
    .populate("createdBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("affectedBy", "name email role")
    .lean();

  const total = interventions.length;

  // By status
  const byStatus = { NON_AFFECTEE: 0, ASSIGNEE: 0, EN_COURS: 0, TERMINEE: 0, REFUSEE: 0 };
  interventions.forEach((i) => {
    const etat = String(i.etat || "NON_AFFECTEE").toUpperCase();
    if (byStatus[etat] !== undefined) byStatus[etat]++;
    else byStatus.NON_AFFECTEE++;
  });

  // By type
  const byType = { ELECTRIQUE: 0, INFORMATIQUE: 0, MECANIQUE: 0, PLOMBERIE: 0, AUTRE: 0 };
  interventions.forEach((i) => {
    const name = String(i.name || "").toLowerCase();
    if (name.includes("info")) byType.INFORMATIQUE++;
    else if (name.includes("elec")) byType.ELECTRIQUE++;
    else if (name.includes("meca")) byType.MECANIQUE++;
    else if (name.includes("plom") || name.includes("chaud") || name.includes("froid")) byType.PLOMBERIE++;
    else byType.AUTRE++;
  });

  // Current month stats
  const thisMonthInterventions = interventions.filter((i) => {
    const d = new Date(i.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisMonth = {
    total: thisMonthInterventions.length,
    enCours: thisMonthInterventions.filter((i) => String(i.etat).toUpperCase() === "EN_COURS").length,
    terminee: thisMonthInterventions.filter((i) => String(i.etat).toUpperCase() === "TERMINEE").length,
    nonAffectee: thisMonthInterventions.filter((i) =>
      ["NON_AFFECTEE", "ASSIGNEE"].includes(String(i.etat).toUpperCase())
    ).length,
  };

  // Monthly evolution (12 months)
  const monthlyEvolution = Array(12).fill(0);
  interventions.forEach((i) => {
    const d = new Date(i.createdAt);
    if (d.getFullYear() === currentYear) {
      monthlyEvolution[d.getMonth()]++;
    }
  });

  // Urgent interventions
  const urgentCount = interventions.filter((i) => {
    const degree = String(i.degree || "").toUpperCase();
    return degree === "CRITIQUE" || degree === "URGENT";
  }).length;

  // Top problematic locations
  const locationMap = {};
  interventions.forEach((i) => {
    const lieu = String(i.lieu || "Non specifie").trim();
    locationMap[lieu] = (locationMap[lieu] || 0) + 1;
  });
  const topLocations = Object.entries(locationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lieu, count]) => ({ lieu, count }));

  // ── Technician performance ──
  const technicianMap = {};
  interventions.forEach((i) => {
    const tech = i.affectedBy || i.assignedTo;
    if (!tech || !tech._id) return;
    const id = String(tech._id);
    if (!technicianMap[id]) {
      technicianMap[id] = {
        name: tech.name || "Inconnu",
        role: tech.role || "",
        total: 0,
        terminee: 0,
        enCours: 0,
      };
    }
    technicianMap[id].total++;
    const etat = String(i.etat || "").toUpperCase();
    if (etat === "TERMINEE") technicianMap[id].terminee++;
    else if (etat === "EN_COURS") technicianMap[id].enCours++;
  });

  const technicianPerformance = Object.values(technicianMap)
    .sort((a, b) => b.terminee - a.terminee)
    .slice(0, 5);

  const topTechnician = technicianPerformance.length > 0 ? technicianPerformance[0] : null;

  // ── Reclamations ──
  const reclamations = await Reclamation.find({}).lean();
  const reclamationStats = {
    total: reclamations.length,
    enAttente: reclamations.filter((r) => r.status === "EN_ATTENTE").length,
    acceptee: reclamations.filter((r) => r.status === "ACCEPTEE").length,
    refusee: reclamations.filter((r) => r.status === "REFUSEE").length,
    terminee: reclamations.filter((r) => r.status === "TERMINEE").length,
  };

  // ── Resolution rate ──
  const resolutionRate = total > 0 ? Math.round((byStatus.TERMINEE * 100) / total) : 0;
  const monthlyResolutionRate =
    thisMonth.total > 0 ? Math.round((thisMonth.terminee * 100) / thisMonth.total) : 0;

  return {
    generatedAt: now.toISOString(),
    monthLabel: MONTHS_FR[currentMonth] + " " + currentYear,
    interventions: {
      total,
      byStatus,
      byType,
      thisMonth,
      monthlyEvolution,
      urgentCount,
      nonAffecteeCount: byStatus.NON_AFFECTEE,
      topLocations,
      resolutionRate,
      monthlyResolutionRate,
    },
    technicians: {
      topTechnician,
      ranking: technicianPerformance,
    },
    reclamations: reclamationStats,
  };
}

module.exports = { gatherReportStats };
