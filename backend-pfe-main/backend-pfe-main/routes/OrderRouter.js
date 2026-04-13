const express = require("express");
const route = express.Router();

const Ordercontroller = require("../controllers/CommandeController");
const isauth = require("../middlewares/isauth");
const isadmin = require("../middlewares/isAdmin");


route.post("/", isauth, Ordercontroller.createCommande);


route.get("/all", isauth, Ordercontroller.getAllCommande);


route.get("/one/:id", isauth, Ordercontroller.getCommandeById);


route.put("/one/:id", isauth, isadmin, Ordercontroller.updateCommande);


route.get("/:id", isauth, Ordercontroller.getAllCommandebyIntervention);


route.put("/:id", isauth, isadmin, Ordercontroller.updateStatus);


route.put("/intervention/:id", isauth, Ordercontroller.orderToIntervention);


route.delete("/:id", isauth, isadmin, Ordercontroller.deleteOrder);

module.exports = route;