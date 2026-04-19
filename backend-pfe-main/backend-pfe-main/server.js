require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

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
  res.send("Server OK 🚀");
});

app.get("/hello/:name", (req, res) => {
  res.send("hello " + req.params.name);
});

app.get("/getfile/:image", (req, res) => {
  res.sendFile(path.join(__dirname, "uploads", req.params.image));
});

// ================= 🔥 TEST EMAIL ROUTE =================
app.get("/test-email", async (req, res) => {
  try {
    console.log("USER:", process.env.SMTP_USER);
    console.log("PASS:", process.env.SMTP_PASS);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465, // 🔥 نستعمل 465 (أكثر استقرار مع Gmail)
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    console.log("SMTP OK ✅");

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "TEST OTP ✔️",
      text: "Email fonctionne parfaitement 🚀",
    });

    res.json({
      success: true,
      message: "Email sent ✅",
    });

  } catch (err) {
    console.error("SMTP ERROR ❌:", err);

    res.json({
      success: false,
      message: err.message,
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
    console.error("❌ Gemini ERROR FULL:", err);
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
    console.log("[DB] MongoDB connected ✅");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Running on port ${PORT} 🚀`);
    });
  })
  .catch((error) => {
    console.error("[DB] MongoDB connection failed ❌", error);
    process.exit(1);
  });