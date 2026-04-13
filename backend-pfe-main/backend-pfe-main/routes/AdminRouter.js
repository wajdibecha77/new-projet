const express = require('express')

const route = express.Router()

const admincontroller = require('../controllers/AdminController')

//create admin
route.post("/",admincontroller.createadmin);

module.exports = route