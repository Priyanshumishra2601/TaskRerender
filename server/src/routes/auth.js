import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { authRequired, signToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const countRows = await query("SELECT COUNT(*) AS c FROM users", []);
    const isFirst = Number(countRows[0]?.c || 0) === 0;
    const role = isFirst ? "Admin" : "Member";
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, role]
    );
    const userId = result.insertId;
    const token = signToken({ sub: userId, role });
    res.status(201).json({
      token,
      user: { id: userId, name, email, role },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const rows = await query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({ sub: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const rows = await query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/members", authRequired, async (req, res) => {
  try {
    const rows = await query(
      "SELECT id, name, email, role FROM users ORDER BY name ASC",
      []
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
