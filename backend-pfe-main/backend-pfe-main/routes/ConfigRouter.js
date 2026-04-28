const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const configFilePath = path.join(__dirname, "..", "storage", "app-config.json");

function ensureConfigFile() {
  const folder = path.dirname(configFilePath);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(
      configFilePath,
      JSON.stringify({ aiEnabled: false }, null, 2),
      "utf8"
    );
  }
}

function readConfig() {
  ensureConfigFile();
  const raw = fs.readFileSync(configFilePath, "utf8");
  const parsed = JSON.parse(raw || "{}");

  return {
    aiEnabled: Boolean(parsed.aiEnabled),
  };
}

function writeConfig(nextConfig) {
  ensureConfigFile();
  fs.writeFileSync(configFilePath, JSON.stringify(nextConfig, null, 2), "utf8");
}

router.get("/ai-toggle", (req, res) => {
  try {
    const cfg = readConfig();
    return res.status(200).json({ enabled: cfg.aiEnabled });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to read AI toggle config",
      error: error.message,
    });
  }
});

router.put("/ai-toggle", (req, res) => {
  try {
    const enabled = Boolean(req.body && req.body.enabled);
    const cfg = readConfig();
    const nextCfg = { ...cfg, aiEnabled: enabled };
    writeConfig(nextCfg);

    return res.status(200).json({ enabled: nextCfg.aiEnabled });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update AI toggle config",
      error: error.message,
    });
  }
});

module.exports = router;
