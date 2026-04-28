require("dotenv").config({ override: true });

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { sendEmail } = require("./services/email.service");

const app = express();

// ================= CONFIG =================
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ================= STATIC =================
app.use("/uploads", express.static("uploads"));

// ================= ROUTES =================
app.use("/reclamations", require("./routes/ReclamationRouter"));
app.use("/users", require("./routes/UserRouter"));
app.use("/orders", require("./routes/OrderRouter"));
app.use("/services", require("./routes/ServiceRouter"));
app.use("/interventions", require("./routes/InterventionRouter"));
app.use("/admins", require("./routes/AdminRouter"));
app.use("/auth", require("./routes/AuthRouter"));
app.use("/notifications", require("./routes/NotificationRouter"));

// ================= TEST ROUTES =================
app.get("/", (req, res) => {
  res.send("Server OK ??");
});

app.get("/hello/:name", (req, res) => {
  res.send("hello " + req.params.name);
});

app.get("/getfile/:image", (req, res) => {
  res.sendFile(path.join(__dirname, "uploads", req.params.image));
});

// ================= ?? TEST EMAIL ROUTE =================
app.get("/test-email", async (req, res) => {
  try {
    const to = String(req.query?.to || process.env.SMTP_USER || "").trim();
    if (!to) {
      return res.status(400).json({ success: false, message: "Recipient email is required" });
    }

    const info = await sendEmail(to, "TEST EMAIL", "<p>Email works.</p>");

    res.json({
      success: true,
      message: "Email sent",
      to,
      provider: info?.provider || "smtp",
      messageId: info?.messageId || null,
    });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Email failed",
      code: error?.code || null,
      command: error?.command || null,
      response: error?.response?.data || error?.response || null,
      emailProvider: String(process.env.EMAIL_PROVIDER || "auto"),
      hasResendKey: Boolean(String(process.env.RESEND_API_KEY || "").trim()),
      resendFrom: String(process.env.RESEND_FROM || "").trim() || null,
    });
  }
});
// ================= GEMINI TEST =================
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.get("/test-gemini", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ msg: "API KEY manich mawjouda !" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "câble électrique brûlé près d'une porte"
            }
          ]
        }
      ]
    });

    const text = result.response.text();

    console.log("Gemini result:", text);

    res.json({ result: text });

  } catch (err) {
    console.error("? Gemini ERROR FULL:", err);
    res.status(500).json({ msg: err.message });
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

console.log("MONGO_URI:", process.env.MONGO_URI);

if (!process.env.MONGO_URI) {
  console.error("[DB] MONGO_URI is missing. Server not started.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("[DB] MongoDB connected ?");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Running on port ${PORT} ??`);
    });
  })
  .catch((error) => {
    console.error("[DB] MongoDB connection failed ?", error);
    process.exit(1);
  });

