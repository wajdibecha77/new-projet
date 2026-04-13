const express = require("express");

const route = express.Router();
const upload = require('../middlewares/upload')

const productcontroller = require("../controllers/ProductController");
const isauth = require("../middlewares/isauth");

const isadmin = require("../middlewares/isAdmin");

//create product
route.post("/",isauth, isadmin ,upload.single('image')  ,   productcontroller.create);
route.delete("/:id",isauth, isadmin ,  productcontroller.deleteproduct);
route.put("/image/:id",isauth, isadmin , upload.single('image')  ,  productcontroller.updateimage);
route.put("/:id",isauth, isadmin ,  productcontroller.updateproductinfo);
route.get("/:id", productcontroller.getproductbyid);
route.get("/", productcontroller.getalllproducts);

module.exports = route;