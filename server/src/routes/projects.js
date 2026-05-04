import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

async function userProjectIds(userId) {
  const rows = await query(
    `SELECT p.id FROM projects p
     LEFT JOIN project_members pm ON pm.projectId = p.id AND pm.userId = ?
     WHERE p.createdBy = ? OR pm.userId IS NOT NULL`,
    [userId, userId]
  );
  return rows.map((r) => r.id);
}

router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query(
      `SELECT DISTINCT p.id, p.title, p.description, p.techStack, p.status, p.createdBy, p.createdAt
       FROM projects p
       LEFT JOIN project_members pm ON pm.projectId = p.id
       WHERE p.createdBy = ? OR pm.userId = ?
       ORDER BY p.createdAt DESC`,
      [userId, userId]
    );
    const mapped = rows.map((r) => {
      let tech = r.techStack;
      if (typeof tech === "string") {
        try {
          tech = JSON.parse(tech);
        } catch {
          tech = [];
        }
      }
      if (!Array.isArray(tech)) tech = [];
      return { ...r, techStack: tech };
    });
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, techStack, status } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }
    const stack = Array.isArray(techStack) ? techStack : [];
    const projectStatus = status && String(status).trim() ? String(status).trim() : "active";
    const json = JSON.stringify(stack);
    const result = await query(
      `INSERT INTO projects (title, description, techStack, status, createdBy) VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, json, projectStatus, req.user.id]
    );
    const projectId = result.insertId;
    await query(
      `INSERT INTO project_members (projectId, userId) VALUES (?, ?)`,
      [projectId, req.user.id]
    );
    const rows = await query(
      `SELECT id, title, description, techStack, status, createdBy, createdAt FROM projects WHERE id = ?`,
      [projectId]
    );
    const p = rows[0];
    let tech = p.techStack;
    if (typeof tech === "string") {
      try {
        tech = JSON.parse(tech);
      } catch {
        tech = [];
      }
    }
    if (!Array.isArray(tech)) tech = [];
    res.status(201).json({ ...p, techStack: tech });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id/members", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const allowed = await userProjectIds(req.user.id);
    if (!allowed.includes(projectId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.role
       FROM project_members pm
       JOIN users u ON u.id = pm.userId
       WHERE pm.projectId = ?`,
      [projectId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/members", async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const projectId = Number(req.params.id);
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId required" });
    const allowed = await userProjectIds(req.user.id);
    if (!allowed.includes(projectId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await query(
      `INSERT IGNORE INTO project_members (projectId, userId) VALUES (?, ?)`,
      [projectId, userId]
    );
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
