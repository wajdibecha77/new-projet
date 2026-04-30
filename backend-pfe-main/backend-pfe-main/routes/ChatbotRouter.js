const express = require("express");
const router = express.Router();

const isauth = require("../middlewares/isauth");
const { chatbot } = require("../controllers/ChatbotController");

router.post("/", isauth, chatbot);

module.exports = router;
