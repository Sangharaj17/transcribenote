const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const transcribeRoutes = require("./routes/transcribe.routes");
const authRoutes = require("./routes/auth.routes");
const deepgramService = require("./services/deepgram.service");
const { uploadDir, transcriptDir, streamDir } = require("./config/paths");
const { ensureDirectory } = require("./utils/file.utils");

const app = express();

ensureDirectory(uploadDir);
ensureDirectory(transcriptDir);
ensureDirectory(streamDir);

app.use(express.json());

// CORS for frontend (allow your frontend origin)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Session-Id, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function getWhisperCommandForHealth() {
  if (process.env.WHISPER_PATH) return process.env.WHISPER_PATH;
  if (process.env.WHISPER_CMD) return process.env.WHISPER_CMD;
  return process.platform === "win32" ? "py" : "python3";
}

app.get("/api/health", (req, res) => {
  const whisperCmd = getWhisperCommandForHealth();
  const looksLikePath = typeof whisperCmd === "string" && (whisperCmd.includes("/") || whisperCmd.includes("\\"));
  res.json({
    ok: true,
    platform: process.platform,
    node: process.version,
    cwd: process.cwd(),
    env: {
      whisper_cmd: whisperCmd,
      whisper_path_exists: looksLikePath ? fs.existsSync(whisperCmd) : null,
      ffmpeg_path: process.env.FFMPEG_PATH || process.env.FFMPEG_BIN || null,
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", transcribeRoutes);

app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", (ws) => {
  const live = deepgramService.createLiveConnection(
    (transcript, isFinal) => {
      try {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ transcript, isFinal }));
        }
      } catch (e) {
        console.error(e);
      }
    },
    (err) => {
      console.error("Deepgram:", err.message || err);
      try {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ error: err.message || "Transcription error" }));
        }
      } catch (_) {}
    }
  );

  if (!live) {
    ws.close(1011, "Deepgram not configured");
    return;
  }

  ws.on("message", (data) => {
    if (Buffer.isBuffer(data) && live) {
      live.send(data);
    }
  });

  ws.on("close", () => {
    if (live && live.close) live.close();
  });
});

const PORT = process.env.PORT || 9001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (!deepgramService.isConfigured()) {
    console.log("⚠ Live transcription: add DEEPGRAM_API_KEY to .env (see .env.example)");
  }
});

