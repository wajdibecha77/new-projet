const express = require("express");

const route = express.Router();

const InterController = require("../controllers/InterventionController");
const isAdmin = require("../middlewares/isAdmin");
const isauth = require("../middlewares/isauth");

/* ================= ROUTES ================= */

route.get("/all", isauth, InterController.allInterventions);

route.get("/my", isauth, InterController.myInterventions);

route.post("/add-intervention", isauth, InterController.addIntervention);

route.put("/update/:id", isauth, InterController.updateIntervention);

route.delete("/delete/:id", isauth, isAdmin, InterController.deleteIntervention);

route.get("/id/:id", isauth, InterController.getInterventionById);

module.exports = route;
