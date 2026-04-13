const express = require("express");

const route = express.Router();

const ServiceController = require("../controllers/ServiceController");

route.post("/add-service", ServiceController.addService);
route.get("/getAllSerives", ServiceController.getAllServices);
route.get("/getService/:id", ServiceController.getServiceById);
route.put("/updateService/:id", ServiceController.updateService);

route.delete("/delete/:id", ServiceController.deleteService);

module.exports = route;
