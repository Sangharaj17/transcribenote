const { pool } = require("../config/db");

exports.getNotes = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      "SELECT id, recording_session_id, transcript_text, created_at FROM transcripts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json({ success: true, notes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};
