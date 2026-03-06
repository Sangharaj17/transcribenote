const { supabase } = require("../config/db");
const path = require("path");
const fs = require("fs");
const { transcriptDir } = require("../config/paths");

exports.getNotes = async (req, res) => {
  try {
    const userId = req.userId != null ? String(req.userId) : null;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { data: notes, error } = await supabase
      .from("transcripts")
      .select("id, recording_session_id, transcript_text, audio_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[notes] Supabase error:", error.message);
      return res.status(500).json({ error: "Failed to fetch notes" });
    }
    console.log("[notes] User", userId.slice(0, 8) + "...", "notes count:", (notes || []).length);
    res.json({ success: true, notes: notes || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

/** Update a transcript (auth required). Body: { transcript_text }. Also updates .txt file if audio_path exists. */
exports.updateNote = async (req, res) => {
  try {
    const userId = req.userId != null ? String(req.userId) : null;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const noteId = req.params.id;
    const { transcript_text } = req.body;
    if (transcript_text == null) {
      return res.status(400).json({ error: "transcript_text required" });
    }
    const text = String(transcript_text).trim();

    const { data: existing, error: fetchErr } = await supabase
      .from("transcripts")
      .select("id, audio_path")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();
    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Note not found" });
    }

    const { error: updateErr } = await supabase
      .from("transcripts")
      .update({ transcript_text: text })
      .eq("id", noteId)
      .eq("user_id", userId);
    if (updateErr) {
      console.error("[notes] Update error:", updateErr.message);
      return res.status(500).json({ error: "Failed to save" });
    }

    if (existing.audio_path) {
      try {
        const filePath = path.join(transcriptDir, existing.audio_path);
        fs.writeFileSync(filePath, text, "utf8");
      } catch (e) {
        console.error("[notes] File write error:", e.message);
      }
    }

    res.json({ success: true, transcript_text: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save" });
  }
};
