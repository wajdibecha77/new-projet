const express = require("express");
const router = express.Router();

const isauth = require("../middlewares/isauth");
const { chatbot, chatbotHistory } = require("../controllers/ChatbotController");

router.post("/", isauth, chatbot);
router.post("/chatbot-ai", isauth, chatbot);
router.get("/chatbot-history", isauth, chatbotHistory);

module.exports = router;
