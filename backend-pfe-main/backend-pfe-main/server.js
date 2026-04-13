require("dotenv").config({ override: true });

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================= DB =================
const connectDatabase = require("./config/database");

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

// ================= GEMINI TEST (WORKING) =================
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.get("/test-gemini", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ msg: "API KEY manich mawjouda !" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ model صحيح
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    // ✅ format جديد صحيح
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

connectDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("[DB] Connection failed. Server not started:", error.message);
    process.exit(1);
  });
