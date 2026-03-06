const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../config/db");
const { JWT_SECRET } = require("../middleware/auth");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const emailLower = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailLower)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    const hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from("users")
      .insert({ email: emailLower, password_hash: hash })
      .select("id, email, created_at")
      .single();
    if (error) {
      if (error.code === "23505") return res.status(400).json({ error: "Email already registered" });
      console.error("[auth/signup] Supabase error:", error.code, error.message, error.details);
      return res.status(500).json({ error: "Sign up failed. Check server logs." });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sign up failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const emailLower = String(email).trim().toLowerCase();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, password_hash")
      .eq("email", emailLower)
      .single();
    if (error || !user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};
