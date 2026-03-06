const express = require("express");
const multer = require("multer");
const path = require("path");

const transcribeController = require("../controllers/transcribe.controller");
const streamController = require("../controllers/stream.controller");
const notesController = require("../controllers/notes.controller");
const { authMiddleware } = require("../middleware/auth");
const { uploadDir, streamDir } = require("../config/paths");
const { ensureDirectory } = require("../utils/file.utils");

const router = express.Router();

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + path.extname(file.originalname);
    cb(null, unique);
  }
});

const upload = multer({ storage });

// in-memory for streamed chunks (packets)
const memoryUpload = multer({ storage: multer.memoryStorage() });

router.post(
  "/transcribe",
  upload.single("audio"),
  transcribeController.transcribeAudio
);

// Finish: merge chunks (ffmpeg), transcribe (whisper), save to DB. Requires auth.
router.post("/finish-stream", authMiddleware, streamController.finishStreamSession);

// Get user's saved notes. Requires auth.
router.get("/notes", authMiddleware, notesController.getNotes);

// Packet: multipart form with "chunk" + "sessionId". Requires auth.
router.post(
  "/stream-audio",
  authMiddleware,
  memoryUpload.single("chunk"),
  streamController.streamAudio
);

// Stream: raw body piped to file (Content-Type: application/octet-stream or audio/*), X-Session-Id header
router.post(
  "/audio-stream",
  streamController.handleAudioStream
);

module.exports = router;

