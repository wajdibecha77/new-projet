/**
 * Report Statistics Service — v2 Premium
 * Aggregates monthly intervention & reclamation data for the intelligent report.
 * Filters by current month only (start → end of month).
 * NEW: daily breakdown, peak day, monthly technician, averages.
 * This file REPLACES the previous version — does NOT modify any other logic.
 */

const Intervention = require("../models/intervention");
const Reclamation = require("../models/Reclamation");
const User = require("../models/User");

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DAYS_IN_MONTH = (year, month) => new Date(year, month + 1, 0).getDate();

/**
 * Gather monthly statistics for the current month.
 * @returns {Promise<Object>} full stats object
 */
async function gatherReportStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // ── Month boundaries ──
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = DAYS_IN_MONTH(year, month);

  // ── All interventions (historical for global context) ──
  const allInterventions = await Intervention.find({})
    .populate("createdBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("affectedBy", "name email role")
    .lean();

  // ── Monthly interventions ──
  const monthlyInterventions = allInterventions.filter((i) => {
    const d = new Date(i.createdAt);
    return d >= startOfMonth && d <= endOfMonth;
  });

  const total = monthlyInterventions.length;
  const totalGlobal = allInterventions.length;

  // ── By status (monthly) ──
  const byStatus = { NON_AFFECTEE: 0, ASSIGNEE: 0, EN_COURS: 0, TERMINEE: 0, REFUSEE: 0 };
  monthlyInterventions.forEach((i) => {
    const etat = String(i.etat || "NON_AFFECTEE").toUpperCase();
    if (byStatus[etat] !== undefined) byStatus[etat]++;
    else byStatus.NON_AFFECTEE++;
  });

  // ── By type/category (monthly) ──
  const byType = { ELECTRIQUE: 0, INFORMATIQUE: 0, MECANIQUE: 0, PLOMBERIE: 0, AUTRE: 0 };
  monthlyInterventions.forEach((i) => {
    const name = String(i.name || "").toLowerCase();
    if (name.includes("info")) byType.INFORMATIQUE++;
    else if (name.includes("elec") || name.includes("élec")) byType.ELECTRIQUE++;
    else if (name.includes("meca") || name.includes("méca")) byType.MECANIQUE++;
    else if (name.includes("plom") || name.includes("chaud") || name.includes("froid")) byType.PLOMBERIE++;
    else byType.AUTRE++;
  });

  // ── Urgent interventions ──
  const urgentCount = monthlyInterventions.filter((i) => {
    const degree = String(i.degree || "").toUpperCase();
    return degree === "CRITIQUE" || degree === "URGENT";
  }).length;

  // ── Resolution rate ──
  const resolutionRate = total > 0 ? Math.round((byStatus.TERMINEE * 100) / total) : 0;

  // ── Daily breakdown (interventions per day of month) ──
  const dailyCounts = Array(daysInMonth).fill(0);
  monthlyInterventions.forEach((i) => {
    const day = new Date(i.createdAt).getDate() - 1; // 0-indexed
    if (day >= 0 && day < daysInMonth) dailyCounts[day]++;
  });

  const avgPerDay = total > 0 ? Math.round((total / now.getDate()) * 10) / 10 : 0;
  const peakDayCount = Math.max(...dailyCounts, 0);
  const peakDayIndex = dailyCounts.indexOf(peakDayCount);
  const peakDay = peakDayCount > 0 ? peakDayIndex + 1 : null;

  // ── Last 7 days (for recent trend) ──
  const last7Days = [];
  for (let d = 6; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(now.getDate() - d);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    const count = allInterventions.filter((i) => {
      const cd = new Date(i.createdAt);
      return cd >= dayStart && cd <= dayEnd;
    }).length;
    last7Days.push({ date: dayStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), count });
  }

  // ── Top problematic locations (monthly) ──
  const locationMap = {};
  monthlyInterventions.forEach((i) => {
    const lieu = String(i.lieu || "Non spécifié").trim();
    locationMap[lieu] = (locationMap[lieu] || 0) + 1;
  });
  const topLocations = Object.entries(locationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lieu, count]) => ({ lieu, count }));

  // ── Technician performance (monthly) ──
  const technicianMap = {};
  monthlyInterventions.forEach((i) => {
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
        urgent: 0,
      };
    }
    technicianMap[id].total++;
    const etat = String(i.etat || "").toUpperCase();
    if (etat === "TERMINEE") technicianMap[id].terminee++;
    else if (etat === "EN_COURS") technicianMap[id].enCours++;
    const degree = String(i.degree || "").toUpperCase();
    if (degree === "CRITIQUE" || degree === "URGENT") technicianMap[id].urgent++;
  });

  const technicianRanking = Object.values(technicianMap)
    .sort((a, b) => b.terminee - a.terminee || b.total - a.total)
    .slice(0, 5);

  const technicianOfMonth = technicianRanking.length > 0 ? technicianRanking[0] : null;

  // ── Technician score (%) ──
  technicianRanking.forEach((t) => {
    t.scorePercent = t.total > 0 ? Math.round((t.terminee * 100) / t.total) : 0;
  });

  // ── Reclamations (monthly) ──
  const allReclamations = await Reclamation.find({}).lean();
  const monthlyReclamations = allReclamations.filter((r) => {
    const d = new Date(r.createdAt);
    return d >= startOfMonth && d <= endOfMonth;
  });
  const reclamationStats = {
    total: monthlyReclamations.length,
    totalGlobal: allReclamations.length,
    enAttente: monthlyReclamations.filter((r) => r.status === "EN_ATTENTE").length,
    acceptee: monthlyReclamations.filter((r) => r.status === "ACCEPTEE").length,
    refusee: monthlyReclamations.filter((r) => r.status === "REFUSEE").length,
    terminee: monthlyReclamations.filter((r) => r.status === "TERMINEE").length,
  };

  // ── Monthly evolution (12 months) for historical context ──
  const monthlyEvolution = Array(12).fill(0);
  allInterventions.forEach((i) => {
    const d = new Date(i.createdAt);
    if (d.getFullYear() === year) {
      monthlyEvolution[d.getMonth()]++;
    }
  });

  return {
    generatedAt: now.toISOString(),
    period: {
      month: MONTHS_FR[month],
      year,
      monthLabel: `${MONTHS_FR[month]} ${year}`,
      startDate: startOfMonth.toLocaleDateString("fr-FR"),
      endDate: endOfMonth.toLocaleDateString("fr-FR"),
      daysInMonth,
      currentDay: now.getDate(),
    },
    interventions: {
      // Monthly
      total,
      totalGlobal,
      byStatus,
      byType,
      urgentCount,
      nonAffecteeCount: byStatus.NON_AFFECTEE,
      resolutionRate,
      // Daily analysis
      dailyCounts,
      avgPerDay,
      peakDay,
      peakDayCount,
      last7Days,
      // Locations
      topLocations,
      // Historical
      monthlyEvolution,
    },
    technicians: {
      technicianOfMonth,
      ranking: technicianRanking,
    },
    reclamations: reclamationStats,
  };
}

module.exports = { gatherReportStats };
