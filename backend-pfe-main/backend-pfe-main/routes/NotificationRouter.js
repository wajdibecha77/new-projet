const express = require("express");
const router = express.Router();

const NotificationController = require("../controllers/NotificationController");
const isauth = require("../middlewares/isauth");

/* ================= GET ALL (ADMIN) ================= */
router.get("/all", isauth, NotificationController.getAllNotifications);

/* ================= GET MY (CLIENT) ================= */
router.get("/my", isauth, NotificationController.getMyNotifications);

/* ================= MARK ALL AS READ ================= */
router.put("/read-all", isauth, NotificationController.markAllAsRead);

/* ================= GET ONE ================= */
router.get("/:id", isauth, NotificationController.getNotificationById);

/* ================= MARK ONE AS READ ================= */
router.put("/:id/read", isauth, NotificationController.markAsRead);

module.exports = router;