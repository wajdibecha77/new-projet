const express = require("express");

const route = express.Router();

const visiteurcontroller = require("../controllers/UserConroller");

//create visiteur
route.post("/", visiteurcontroller.createuser);

module.exports = route;
