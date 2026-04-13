const Notification = require("../models/Notification");
const User = require("../models/User");
const Intervention = require("../models/intervention");

/* ================= HELPERS ================= */
const normalizeRole = (role) => String(role || "").toUpperCase();

/* ================= SCOPE ================= */
const buildNotificationScope = async (req) => {
  const me = await User.findById(req.user?.id).select("role");

  if (!me) {
    return { denied: true, query: { _id: null } };
  }

  // ✅ كل user (admin ولا client) يشوف غير متاعو
  return {
    denied: false,
    query: {
      userId: req.user.id
    }
  };
};

/* ================= CONTROLLER ================= */

module.exports = {

  /* ================= GET ALL ================= */
  getAllNotifications: async (req, res) => {
    try {
      const { denied, query } = await buildNotificationScope(req);

      if (denied) {
        return res.status(401).json({
          message: "user not found",
          data: [],
        });
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(100);

      return res.status(200).json({
        message: "notifications found",
        data: notifications,
      });

    } catch (error) {
      console.error("GET ALL ERROR =", error);
      return res.status(500).json({
        message: error.message || "error from server",
      });
    }
  },

  /* ================= GET MY ================= */
  getMyNotifications: async (req, res) => {
    return module.exports.getAllNotifications(req, res);
  },

  /* ================= GET ONE ================= */
  getNotificationById: async (req, res) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "notification id is required",
      });
    }

    try {
      const { denied, query } = await buildNotificationScope(req);

      if (denied) {
        return res.status(401).json({
          message: "user not found",
          data: null,
        });
      }

      const notification = await Notification.findOne({
        _id: req.params.id,
        ...(Object.keys(query).length ? query : {}),
      });

      if (!notification) {
        return res.status(404).json({
          message: "notification not found",
          data: null,
        });
      }

      return res.status(200).json({
        message: "notification found",
        data: notification,
      });

    } catch (error) {
      console.error("GET ONE ERROR =", error);
      return res.status(500).json({
        message: error.message || "error from server",
      });
    }
  },

  /* ================= MARK ONE ================= */
  markAsRead: async (req, res) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "notification id is required",
      });
    }

    try {
      const { denied, query } = await buildNotificationScope(req);

      if (denied) {
        return res.status(401).json({
          message: "user not found",
          data: null,
        });
      }

      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          ...(Object.keys(query).length ? query : {}),
        },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          message: "notification not found",
          data: null,
        });
      }

      return res.status(200).json({
        message: "notification marked as read",
        data: notification,
      });

    } catch (error) {
      console.error("MARK ONE ERROR =", error);
      return res.status(500).json({
        message: error.message || "error from server",
      });
    }
  },

  /* ================= MARK ALL ================= */
  markAllAsRead: async (req, res) => {
    try {
      const { denied, query } = await buildNotificationScope(req);

      if (denied) {
        return res.status(401).json({
          message: "user not found",
          data: null,
        });
      }

      const result = await Notification.updateMany(
        {
          ...(Object.keys(query).length ? query : {}),
          isRead: false,
        },
        {
          $set: { isRead: true },
        }
      );

      return res.status(200).json({
        message: "all notifications marked as read",
        data: {
          modifiedCount: result.modifiedCount || 0,
          matchedCount: result.matchedCount || 0,
        },
      });

    } catch (error) {
      console.error("MARK ALL ERROR =", error);
      return res.status(500).json({
        message: error.message || "error from server",
      });
    }
  },

};