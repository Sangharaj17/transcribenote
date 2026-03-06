const fs = require("fs");
const path = require("path");
const { streamDir, transcriptDir } = require("../config/paths");
const { ensureDirectory } = require("../utils/file.utils");
const mergeService = require("../services/merge.service");
const whisperService = require("../services/whisper.service");
const { supabase } = require("../config/db");

/**
 * Packet: receive one audio chunk (multipart form).
 * Body: chunk (file), sessionId (string).
 */
exports.streamAudio = async (req, res) => {
  try {
    const chunk = req.file;
    const sessionId = (req.body && req.body.sessionId) || "unknown";

    if (!chunk || !chunk.buffer) {
      return res.status(400).json({ success: false, error: "No chunk" });
    }

    ensureDirectory(streamDir);
    const sessionPath = path.join(streamDir, sessionId);
    ensureDirectory(sessionPath);

    const filename = `chunk_${Date.now()}.webm`;
    const filepath = path.join(sessionPath, filename);
    fs.writeFileSync(filepath, chunk.buffer);

    res.json({ success: true, saved: filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Stream save failed" });
  }
};

/**
 * Stream: accept raw audio stream in request body; pipe to file.
 * Header: X-Session-Id (optional).
 * Content-Type: application/octet-stream or audio/* (e.g. audio/webm).
 */
exports.handleAudioStream = (req, res) => {
  const sessionId = req.headers["x-session-id"] || "unknown";
  const ext = req.headers["content-type"]?.includes("webm") ? "webm" : "bin";
  ensureDirectory(streamDir);
  const sessionPath = path.join(streamDir, sessionId);
  ensureDirectory(sessionPath);
  const filename = `stream_${Date.now()}.${ext}`;
  const filepath = path.join(sessionPath, filename);
  const ws = fs.createWriteStream(filepath);

  req.pipe(ws);

  ws.on("finish", () => {
    res.json({ success: true, saved: filename });
  });

  ws.on("error", (err) => {
    console.error(err);
    try { fs.unlinkSync(filepath); } catch (_) {}
    res.status(500).json({ success: false, error: "Stream write failed" });
  });

  req.on("error", (err) => {
    console.error(err);
    ws.destroy();
    try { fs.unlinkSync(filepath); } catch (_) {}
    res.status(500).json({ success: false, error: "Stream read failed" });
  });
};

/**
 * Finish session: merge chunks (ffmpeg), transcribe (whisper), save to DB and file.
 * Requires auth. Body: { sessionId }.
 */
exports.finishStreamSession = async (req, res) => {
  try {
    const userId = req.userId != null ? String(req.userId) : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const sessionId = (req.body && req.body.sessionId) || req.query.sessionId || "unknown";
    const sessionPath = path.join(streamDir, sessionId);

    if (!fs.existsSync(sessionPath)) {
      return res.status(400).json({ success: false, error: "Session not found or no chunks" });
    }

    const mergedPath = await mergeService.mergeSession(sessionId);
    const stat = fs.statSync(mergedPath);
    const minBytes = 48000; // ~1.5 sec of 16kHz mono 16-bit
    if (stat.size < minBytes) {
      const shortMessage = "[Recording too short to transcribe. Speak for at least 2 seconds.]";
      try {
        const { error } = await supabase.from("transcripts").insert({
          user_id: userId,
          recording_session_id: sessionId,
          transcript_text: shortMessage,
          audio_path: null,
        });
        if (error) console.error("DB save short:", error.message);
        else console.log("[finish-stream] Saved short message for user", userId.slice(0, 8) + "...");
      } catch (_) {}
      return res.json({
        success: true,
        transcript: shortMessage,
        saved: null
      });
    }

    const transcript = await whisperService.transcribe(mergedPath, sessionPath);
    const cleaned = transcript.trim().replace(/\r\n/g, "\n");

    ensureDirectory(transcriptDir);
    const transcriptFilename = `stream_${sessionId}.txt`;
    const transcriptSavePath = path.join(transcriptDir, transcriptFilename);
    fs.writeFileSync(transcriptSavePath, cleaned, "utf8");

    try {
      const { error } = await supabase.from("transcripts").insert({
        user_id: userId,
        recording_session_id: sessionId,
        transcript_text: cleaned,
        audio_path: transcriptFilename,
      });
      if (error) {
        console.error("DB save failed:", error.message);
        return res.status(500).json({
          success: false,
          error: "Failed to save recording. " + (error.message || "Database error"),
        });
      }
      console.log("[finish-stream] Saved transcript for user", userId.slice(0, 8) + "...");
    } catch (dbErr) {
      console.error("DB save failed:", dbErr.message);
      return res.status(500).json({
        success: false,
        error: "Failed to save recording. " + (dbErr.message || "Database error"),
      });
    }

    res.json({
      success: true,
      transcript: cleaned,
      saved: transcriptSavePath
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || "Merge or transcription failed"
    });
  }
};
