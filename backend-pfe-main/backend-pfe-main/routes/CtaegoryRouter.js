const express = require("express");

const route = express.Router();
const upload = require("../middlewares/upload");

const categoryController = require("../controllers/CategoryController");
const isauth = require("../middlewares/isauth");

const isadmin = require("../middlewares/isAdmin");

route.post("/",isauth , isadmin ,  upload.single("image"), categoryController.createcategory);
route.put("/:id",isauth , isadmin , upload.single("image"), categoryController.upadatecategory);
route.delete("/:id", isauth, isadmin, categoryController.deletecategory);
route.get("/:id",  categoryController.getcategorybyid);
route.get("/",  categoryController.getallcategories);

module.exports = route;