const { supabase } = require("../config/db");

exports.getNotes = async (req, res) => {
  try {
    const userId = req.userId;
    const { data: notes, error } = await supabase
      .from("transcripts")
      .select("id, recording_session_id, transcript_text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch notes" });
    }
    res.json({ success: true, notes: notes || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};
