const { useColors } = require("debug/src/browser");
const { MongoClient, ObjectID } = require("mongodb");
const Intervention = require("../models/intervention");
const User = require("../models/User");
const Notification = require("../models/Notification");

const normalizeRole = (role) => String(role || "").toUpperCase();
const sameId = (a, b) => String(a || "") === String(b || "");
const TECHNICIAN_ROLES = [
  "INFORMATICIEN",
  "ELECTRICIEN",
  "MECANICIEN",
  "PLOMBERIE",
  "PLOMBIER",
  "TECHNICIEN",
];

const isTechnicianRole = (role) => TECHNICIAN_ROLES.includes(normalizeRole(role));
const isAssignedToRequester = (intervention, requesterId) =>
  sameId(intervention?.affectedBy, requesterId) ||
  sameId(intervention?.assignedTo, requesterId);

const createNotificationsForUsers = async (userIds, payload) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];
  if (!uniqueUserIds.length) return;

  await Notification.insertMany(
    uniqueUserIds.map((userId) => ({
      ...payload,
      userId,
      isRead: false,
      createdAt: payload.createdAt || new Date(),
    }))
  );
};

const canAccessIntervention = (intervention, requesterId, requesterRole) => {
  if (!intervention) return false;
  const normalizedRole = normalizeRole(requesterRole);
  if (normalizedRole === "ADMIN") return true;
  if (normalizedRole === "EMPLOYEE") return sameId(intervention.createdBy, requesterId);
  if (isTechnicianRole(normalizedRole)) return isAssignedToRequester(intervention, requesterId);
  return false;
};

module.exports = {
  addIntervention: async (req, res) => {
    const { name, delai, description, lieu, degree, createdBy } = req.body;

    if (!name || !delai || !description || !lieu || !degree) {
      return res.status(400).json({
        message: "all fields is required!",
      });
    }

    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me) {
        return res.status(401).json({
          message: "Utilisateur introuvable",
        });
      }

      const role = normalizeRole(me.role);
      const ownerId =
        role === "ADMIN" && createdBy ? createdBy : req.user.id;

      const newIntervention = new Intervention({
        name: name,

        delai: delai,
        description: description,
        lieu: lieu,
        degree: degree,
        createdBy: ownerId,
      });
      const savedIntervention = await newIntervention.save();

      const creator = await User.findById(ownerId).populate("service");
      if (creator && creator.role === "EMPLOYEE") {
        const admins = await User.find({ role: "ADMIN" }).select("_id");
        const employeeName = creator?.name || "Employe inconnu";
        const concernedTarget =
          (creator?.service && creator.service.name) ||
          description ||
          "Non specifie";
        const interventionDateTime = savedIntervention.createdAt || new Date();

        await createNotificationsForUsers(
          admins.map((admin) => admin._id),
          {
          category: "INTERVENTION_DECLARED",
          title: "Nouvelle declaration d'intervention",
          message:
            employeeName +
            " a declare une intervention de type " +
            name +
            " au lieu " +
            lieu +
            ".",
          type: "warning",
          isRead: false,
          interventionId: savedIntervention._id,
          metadata: {
            interventionType: name,
            employeeName,
            concernedTarget,
            interventionDateTime,
            lieu,
          },
        }
        );
      }

      return res.status(200).json({
        message: "Intervention added!",
        data: savedIntervention,
      });
    } catch (err) {
      return res.status(500).json({
        message: err,
      });
    }
  },

  allInterventions: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me) {
        return res.status(401).json({
          message: "Utilisateur introuvable",
        });
      }

      let query = {};
      const role = String(me.role || "").toUpperCase();
      if (role === "ADMIN") {
        query = {};
      } else if (role === "EMPLOYEE") {
        // Employee/requester: only interventions created by this user.
        query = { createdBy: req.user.id };
      } else if (isTechnicianRole(role)) {
        // Technician: only interventions assigned to me.
        query = {
          $or: [
            { affectedBy: req.user.id },
            { assignedTo: req.user.id },
          ],
        };
      } else {
        return res.status(403).json({
          message: "Role non autorise",
        });
      }

      const interventions = await Intervention.find(query)
        .populate("createdBy")
        .populate("assignedTo")
        .populate("affectedBy")
        .sort({ createdAt: -1 });

      return res.status(200).json(interventions);
    } catch (err) {
      return res.status(500).json({
        message: err.message || "error from server",
      });
    }
  },

  myInterventions: async (req, res) => {
    try {
      const me = await User.findById(req.user?.id).select("role");
      if (!me) {
        return res.status(401).json({
          message: "Utilisateur introuvable",
        });
      }

      const role = normalizeRole(me.role);
      let query = {};

      if (role === "EMPLOYEE") {
        query = { createdBy: req.user.id };
      } else if (isTechnicianRole(role)) {
        query = {
          $or: [{ affectedBy: req.user.id }, { assignedTo: req.user.id }],
        };
      } else if (role === "ADMIN") {
        query = {};
      } else {
        return res.status(403).json({
          message: "Role non autorise",
        });
      }

      const interventions = await Intervention.find(query)
        .populate("createdBy")
        .populate("assignedTo")
        .populate("affectedBy")
        .sort({ createdAt: -1 });

      return res.status(200).json(interventions);
    } catch (err) {
      return res.status(500).json({
        message: err.message || "error from server",
      });
    }
  },

  getInterventionById: async (req, res) => {
    if (!req.params.id) {
      return res.status(400).json({
        status: 400,
        message: "Intervention ID is required in params!",
      });
    }
    try {
      const inter = await Intervention.findById({ _id: req.params.id });
      if (!inter) {
        return res.status(404).json({
          message: "Intervention not found",
        });
      }

      const me = await User.findById(req.user?.id).select("role");
      if (!me) {
        return res.status(401).json({
          message: "Utilisateur introuvable",
        });
      }

      if (!canAccessIntervention(inter, req.user.id, me.role)) {
        return res.status(403).json({
          message: "Acces refuse",
        });
      }

      let createdby = await User.findById({ _id: inter.createdBy });
      let affected = null;
      if (inter.affectedBy) {
        affected = await User.findById({ _id: inter.affectedBy });
      }
      if (inter.affectedToUsers && inter.affectedToUsers.length > 0) {
        let result = await Promise.all(
          inter.affectedToUsers.map(async (id) => {
            let user = await User.findById({ _id: id.toString() });
            return user;
          })
        );

        return res.status(200).json({
          name: inter.name,
          type: inter.type || inter.name || "AUTRE",
          isAI: Boolean(inter.isAI),
          aiDetails: inter.aiDetails || "",
          _id: inter._id,
          createdBy: createdby,
          degree: inter.degree,
          etat: inter.etat,
          delai: inter.delai,
          dateDebut: inter.dateDebut,
          dateEnd: inter.dateEnd || null,
          affectedBy: affected || null,
          description: inter.description,
          lieu: inter.lieu,
          affectedToUsers: result,
          workDetails: inter.workDetails || "",
          technicianComments: inter.technicianComments || [],
          reportedProblems: inter.reportedProblems || [],
          refusCommentaire: inter.refusCommentaire || "",
          refusType: inter.refusType || null,
          lastRefusCommentaire: inter.refusCommentaire || "",
          history: inter.history || [],
        });
      }

      return res.status(200).json({
        name: inter.name,
        type: inter.type || inter.name || "AUTRE",
        isAI: Boolean(inter.isAI),
        aiDetails: inter.aiDetails || "",
        _id: inter._id,
        createdBy: createdby,
        degree: inter.degree,
        etat: inter.etat,
        dateDebut: inter.dateDebut,
        dateEnd: inter.dateEnd || null,
        delai: inter.delai,
        affectedBy: affected || null,
        description: inter.description,
        lieu: inter.lieu,
        affectedToUsers: null,
        workDetails: inter.workDetails || "",
        technicianComments: inter.technicianComments || [],
        reportedProblems: inter.reportedProblems || [],
        refusCommentaire: inter.refusCommentaire || "",
        refusType: inter.refusType || null,
        lastRefusCommentaire: inter.refusCommentaire || "",
        history: inter.history || [],
      });
    } catch (err) {
      return res.status(400).json({
        message: err,
      });
    }
  },

  deleteIntervention: async (req, res) => {
    if (req.params.id) {
      let id = req.params.id;
      try {
        await Intervention.findByIdAndDelete({ _id: id });
        res.status(200).json({
          message: "Intervention deleted successfully",
        });
      } catch (err) {
        res.status(500).json({
          message: "Error collection!",
        });
      }
    } else {
      res.status(400).json({
        message: "ID is required!",
      });
    }
  },

  updateIntervention: async (req, res) => {
    try {
      const { affectedBy, etat, fermer, workDetails, comment, problem } = req.body;
      const me = await User.findById(req.user?.id).select("role name");
      if (!me) {
        return res.status(401).json({
          message: "Utilisateur introuvable",
        });
      }

      const requesterRole = normalizeRole(me.role);
      const isAdmin = requesterRole === "ADMIN";
      const inter = await Intervention.findById({ _id: req.params.id });

      if (!inter) {
        return res.status(404).json({
          message: "Intervention introuvable",
        });
      }

      const hasAssignmentUpdate = !!affectedBy;
      const hasStatusUpdate = !!etat || !!fermer;
      const hasWorkUpdate =
        (workDetails !== undefined && String(workDetails).trim() !== "") ||
        (comment !== undefined && String(comment).trim() !== "") ||
        (problem !== undefined && String(problem).trim() !== "");

      if (req.params.id && hasAssignmentUpdate) {
        if (!isAdmin) {
          return res.status(403).json({
            message: "Seul l'administrateur peut affecter une intervention",
          });
        }

        await Intervention.findByIdAndUpdate(
          { _id: req.params.id },
          {
            assignedTo: affectedBy,
            affectedBy: affectedBy,
            affectedToUsers: inter.affectedToUsers && inter.affectedToUsers.length > 0 ? [...inter.affectedToUsers, affectedBy] : [affectedBy],
            dateDebut: Date.now(),
            etat: "EN_COURS",
          }
        );

        return res.status(200).json({
          message: "Intervention affected to tech successfully",
        });
      } else if (fermer && !etat) {
      if (!isAdmin && !sameId(inter.affectedBy, req.user.id)) {
        return res.status(403).json({
          message: "Acces refuse",
        });
      }

        await Intervention.findByIdAndUpdate(
          { _id: req.params.id },
          {
            $set: {
              dateDebut: null,
              etat: "NON_AFFECTEE",
              assignedTo: null,
            },
            $unset: {
              affectedBy: "",
            },
          }
        );

        if (isTechnicianRole(me.role)) {
          const admins = await User.find({ role: "ADMIN" }).select("_id");
          const recipients = [inter.createdBy, ...admins.map((admin) => admin._id)];
          const technicianName = me?.name || "Technicien";
          await createNotificationsForUsers(recipients, {
            category: "INTERVENTION_REFUSED",
            title: "Refus d'intervention",
            message:
              "Le technicien " +
              technicianName +
              " a refus\u00e9 l\u2019intervention qui lui a \u00e9t\u00e9 assign\u00e9e.",
            type: "intervention_refused",
            isRead: false,
            technicienId: req.user.id,
            technicienName: technicianName,
            interventionId: inter._id,
            createdAt: new Date(),
            metadata: {
              interventionType: inter?.name || "",
              employeeName: technicianName,
              concernedTarget: inter?.description || "",
              interventionDateTime: new Date(),
              lieu: inter?.lieu || "",
            },
          });
        }

        return res.status(200).json({
          message: "Intervention updated successfully",
        });
      } else if (etat) {
      if (!isAdmin && !sameId(inter.affectedBy, req.user.id)) {
        return res.status(403).json({
          message: "Acces refuse",
        });
      }

        await Intervention.findByIdAndUpdate(
          { _id: req.params.id },
          {
            dateEnd: Date.now(),
            etat: etat,
          }
        );
        return res.status(200).json({
          message: "Intervention updated successfully",
        });
      } else if (hasWorkUpdate) {
      if (!isAdmin && !sameId(inter.affectedBy, req.user.id)) {
        return res.status(403).json({
          message: "Acces refuse",
        });
      }

        const updateOps = {};

        if (workDetails !== undefined && String(workDetails).trim() !== "") {
          updateOps.$set = {
            workDetails: String(workDetails).trim(),
          };
        }

        if (comment !== undefined && String(comment).trim() !== "") {
          updateOps.$push = {
            ...(updateOps.$push || {}),
            technicianComments: {
              author: req.user.id,
              text: String(comment).trim(),
              createdAt: new Date(),
            },
          };
        }

        if (problem !== undefined && String(problem).trim() !== "") {
          updateOps.$push = {
            ...(updateOps.$push || {}),
            reportedProblems: {
              author: req.user.id,
              description: String(problem).trim(),
              createdAt: new Date(),
              status: "OPEN",
            },
          };
        }

        await Intervention.findByIdAndUpdate({ _id: req.params.id }, updateOps);
        return res.status(200).json({
          message: "Intervention details updated successfully",
        });
      }

      if (!hasStatusUpdate && !hasWorkUpdate && !hasAssignmentUpdate) {
        return res.status(400).json({
          message: "Aucune mise a jour fournie",
        });
      }

      return res.status(400).json({
        message: "Mise a jour non prise en charge",
      });
    } catch (err) {
      return res.status(500).json({
        message: err.message || "error from server",
      });
    }
  },

  refuseIntervention: async (req, res) => {
    try {
      const { commentaire, refusType } = req.body || {};
      const cleanCommentaire = String(commentaire || "").trim();

      if (!cleanCommentaire) {
        return res.status(400).json({
          success: false,
          message: "Le commentaire de refus est obligatoire",
        });
      }

      const inter = await Intervention.findById(req.params.id);
      if (!inter) {
        return res.status(404).json({
          success: false,
          message: "Intervention introuvable",
        });
      }

      const me = await User.findById(req.user?.id).select("role name");
      if (!me) {
        return res.status(401).json({
          success: false,
          message: "Utilisateur introuvable",
        });
      }

      const requesterRole = normalizeRole(me.role);
      if (!isTechnicianRole(requesterRole) || !sameId(inter.affectedBy, req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "Acces refuse",
        });
      }

      inter.etat = "NON_AFFECTEE";
      inter.refusCommentaire = cleanCommentaire;
      if (refusType) {
        inter.refusType = refusType;
      }
      if (!Array.isArray(inter.history)) inter.history = [];
      inter.history.push({
        action: "REFUS",
        technicien: me?.name || "Technicien",
        commentaire: cleanCommentaire,
        date: new Date(),
      });
      inter.assignedTo = null;
      inter.affectedBy = null;
      inter.dateDebut = null;
      await inter.save();

      const admins = await User.find({ role: "ADMIN" }).select("_id");
      const recipients = admins.map((admin) => admin._id);

      await createNotificationsForUsers(recipients, {
        category: "INTERVENTION_REFUSED",
        title: "Refus d'intervention",
        message: "Le technicien a refuse l'intervention. Elle est de nouveau disponible.",
        type: "INTERVENTION_REFUSED",
        technicienId: req.user.id,
        technicienName: me?.name || "Technicien",
        interventionId: inter._id,
        commentaire: cleanCommentaire,
        refusType: refusType || undefined,
        createdAt: new Date(),
        metadata: {
          interventionType: inter?.name || "",
          employeeName: me?.name || "Technicien",
          concernedTarget: inter?.description || "",
          interventionDateTime: new Date(),
          lieu: inter?.lieu || "",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Intervention refusee avec succes",
        data: {
          _id: inter._id,
          etat: inter.etat,
          refusCommentaire: inter.refusCommentaire,
          refusType: inter.refusType || null,
          technicien: null,
          lastRefusCommentaire: inter.refusCommentaire,
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "error from server",
      });
    }
  },
};
