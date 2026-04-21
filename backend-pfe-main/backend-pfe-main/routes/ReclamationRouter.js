const express = require("express");
const router = express.Router();

const ReclamationController = require("../controllers/ReclamationController");
const isauth = require("../middlewares/isauth");
const isAdmin = require("../middlewares/isAdmin");

const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

router.get("/track/:code", ReclamationController.trackReclamationByCode);
router.post("/public", upload.array("images", 5), ReclamationController.addPublicReclamation);
router.post("/add-public", upload.array("images", 5), ReclamationController.addPublicReclamation);
router.post("/add", isauth, upload.array("images", 5), ReclamationController.addReclamation);
router.get("/all", isauth, ReclamationController.getAll);
router.put("/accept/:id", isauth, isAdmin, ReclamationController.acceptReclamation);
router.put("/refuse/:id", isauth, isAdmin, ReclamationController.refuseReclamation);

module.exports = router;
