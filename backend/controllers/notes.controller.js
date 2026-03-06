const { supabase } = require("../config/db");

exports.getNotes = async (req, res) => {
  try {
    const userId = req.userId != null ? String(req.userId) : null;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { data: notes, error } = await supabase
      .from("transcripts")
      .select("id, recording_session_id, transcript_text, created_at")
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
