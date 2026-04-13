const Commande = require("../models/commande");
const User = require("../models/User");
const Intervention = require("../models/intervention");

const normalizeRole = (role) => String(role || "").toUpperCase();

const getRequester = async (req) => {
  const me = await User.findById(req.user?.id).select("role");
  return me || null;
};

const getScopedInterventionIds = async (userId) => {
  const interventions = await Intervention.find({
    $or: [{ createdBy: userId }, { affectedBy: userId }],
  }).select("_id");

  return interventions.map((i) => i._id);
};

const buildOrderScopeQuery = async (req) => {
  const me = await getRequester(req);
  if (!me) return { denied: true, query: { _id: null } };

  const role = normalizeRole(me.role);
  if (role === "ADMIN") return { denied: false, query: {} };

  const myInterventionIds = await getScopedInterventionIds(req.user.id);
  const scopeOr = [{ createdBy: req.user.id }];

  if (myInterventionIds.length > 0) {
    scopeOr.push({ interventionId: { $in: myInterventionIds } });
  }

  return { denied: false, query: { $or: scopeOr } };
};

module.exports = {
  createCommande: async (req, res) => {
    const { produit, quantite, fournisseurId } = req.body;

    const missingFields = [];

    if (produit === undefined || produit === null || String(produit).trim() === "") {
      missingFields.push("produit");
    }

    if (quantite === undefined || quantite === null || String(quantite).trim() === "") {
      missingFields.push("quantite");
    }

    if (fournisseurId === undefined || fournisseurId === null || String(fournisseurId).trim() === "") {
      missingFields.push("fournisseurId");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Champs obligatoires manquants: ${missingFields.join(", ")}`,
      });
    }

    try {
      let newOrder;
      if (req.body.interventionId) {
        newOrder = new Commande({
          produit,
          quantite,
          fournisseurId,
          interventionId: req.body.interventionId,
          createdBy: req.user?.id || null,
        });
      } else {
        newOrder = new Commande({
          produit,
          quantite,
          fournisseurId,
          createdBy: req.user?.id || null,
        });
      }

      const savedOrder = await newOrder.save();
      if (!savedOrder) throw Error("Something went wrong saving the order");

      res.status(200).json({
        message: "order successfuly registred",
        order: savedOrder,
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },

  // ✅ NEW: GET commande by id (for edit page)
  getCommandeById: async (req, res) => {
    try {
      const { denied, query } = await buildOrderScopeQuery(req);
      if (denied) {
        return res.status(401).json({
          message: "user not found",
          data: null,
        });
      }

      const order = await Commande.findOne({
        _id: req.params.id,
        ...(Object.keys(query).length ? query : {}),
      });

      if (!order) {
        return res.status(404).json({
          message: "order not found",
          data: null,
        });
      }

      return res.status(200).json({
        message: "order found",
        data: order,
      });
    } catch (e) {
      return res.status(500).json({
        message: "server error",
        error: e.message,
      });
    }
  },

  // ✅ NEW: UPDATE commande fields (produit/quantite/fournisseurId)
  updateCommande: async (req, res) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "commande not found",
        data: null,
      });
    }

    const { produit, quantite, fournisseurId } = req.body;

    const missingFields = [];

    if (produit === undefined || produit === null || String(produit).trim() === "") {
      missingFields.push("produit");
    }

    if (quantite === undefined || quantite === null || String(quantite).trim() === "") {
      missingFields.push("quantite");
    }

    if (fournisseurId === undefined || fournisseurId === null || String(fournisseurId).trim() === "") {
      missingFields.push("fournisseurId");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Champs obligatoires manquants: ${missingFields.join(", ")}`,
      });
    }

    try {
      const updated = await Commande.findByIdAndUpdate(
        req.params.id,
        { produit, quantite, fournisseurId },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({
          message: "order not found",
          data: null,
        });
      }

      return res.status(200).json({
        message: "order updated successfuly",
        data: updated,
      });
    } catch (e) {
      return res.status(500).json({
        message: "server error",
        error: e.message,
      });
    }
  },

  // status فقط (خليه كما هو)
  updateStatus: (req, res) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "commande not found ",
        data: null,
      });
    }

    Commande.findByIdAndUpdate(
      { _id: req.params.id },
      { status: req.body.status },
      (err, order) => {
        if (!order) {
          return res.status(500).json({
            message: "order not found ",
            data: null,
          });
        } else {
          return res.status(200).json({
            message: "order updated successfuly",
          });
        }
      }
    );
  },

  orderToIntervention: (req, res) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "commande not found ",
        data: null,
      });
    }

    Commande.findByIdAndUpdate(
      { _id: req.params.id },
      { interventionId: req.body.interventionId },
      (err, order) => {
        if (!order) {
          return res.status(500).json({
            message: "order not found ",
            data: null,
          });
        } else {
          return res.status(200).json({
            message: "order found ",
            data: order,
          });
        }
      }
    );
  },

  deleteOrder: (req, res) => {
    Commande.findByIdAndDelete({ _id: req.params.id }, (err) => {
      if (err) {
        return res.status(500).json({
          message: "Order not deleted ",
          data: null,
          status: 500,
        });
      } else {
        return res.status(200).json({
          message: "Order deletd successfuly ",
          data: null,
          status: 200,
        });
      }
    });
  },

  getAllCommande: (req, res) => {
    (async () => {
      try {
        const { denied, query } = await buildOrderScopeQuery(req);
        if (denied) {
          return res.status(401).json({
            message: "user not found",
            data: [],
          });
        }

        const orders = await Commande.find(query).sort({ createdAt: -1 });
        return res.status(200).json({
          message: orders.length ? "orders in system " : "no orders in system ",
          data: orders || [],
        });
      } catch (e) {
        return res.status(500).json({
          message: "server error",
          error: e.message,
          data: [],
        });
      }
    })();
  },

  getAllCommandebyIntervention: (req, res) => {
    (async () => {
      try {
        const { denied, query } = await buildOrderScopeQuery(req);
        if (denied) {
          return res.status(401).json({
            message: "user not found",
            data: [],
          });
        }

        const scopedQuery = {
          interventionId: req.params.id,
          ...(Object.keys(query).length ? query : {}),
        };

        const orders = await Commande.find(scopedQuery).sort({ createdAt: -1 });
        return res.status(200).json({
          message: orders.length ? "orders in system " : "no orders in system ",
          data: orders || [],
        });
      } catch (e) {
        return res.status(500).json({
          message: "server error",
          error: e.message,
          data: [],
        });
      }
    })();
  },
};
