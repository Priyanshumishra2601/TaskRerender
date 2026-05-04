import { Router } from "express";
import { query } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

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
    const ids = await userProjectIds(userId);
    if (!ids.length) {
      return res.json([]);
    }
    const placeholders = ids.map(() => "?").join(",");
    const rows = await query(
      `SELECT t.id, t.projectId, t.assignedTo, t.title, t.status, t.dueDate, t.createdAt, t.completedAt,
              p.title AS projectTitle,
              u.name AS assigneeName
       FROM tasks t
       JOIN projects p ON p.id = t.projectId
       LEFT JOIN users u ON u.id = t.assignedTo
       WHERE t.projectId IN (${placeholders})
       ORDER BY t.dueDate IS NULL, t.dueDate ASC, t.id DESC`,
      ids
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireRole("Admin"), async (req, res) => {
  try {
    const { projectId, title, dueDate, assignedTo } = req.body || {};
    if (!projectId || !title) {
      return res.status(400).json({ error: "projectId and title required" });
    }
    const allowed = await userProjectIds(req.user.id);
    if (!allowed.includes(Number(projectId))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const assignee = assignedTo ? Number(assignedTo) : null;
    const result = await query(
      `INSERT INTO tasks (projectId, assignedTo, title, dueDate) VALUES (?, ?, ?, ?)`,
      [projectId, assignee, title, dueDate || null]
    );
    const taskId = result.insertId;
    const rows = await query(
      `SELECT t.id, t.projectId, t.assignedTo, t.title, t.status, t.dueDate, t.createdAt, t.completedAt,
              p.title AS projectTitle,
              u.name AS assigneeName
       FROM tasks t
       JOIN projects p ON p.id = t.projectId
       LEFT JOIN users u ON u.id = t.assignedTo
       WHERE t.id = ?`,
      [taskId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/assign", requireRole("Admin"), async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { assignedTo } = req.body || {};
    const taskRows = await query(`SELECT projectId FROM tasks WHERE id = ?`, [taskId]);
    if (!taskRows.length) return res.status(404).json({ error: "Not found" });
    const projectId = taskRows[0].projectId;
    const allowed = await userProjectIds(req.user.id);
    if (!allowed.includes(projectId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const assignee = assignedTo === null || assignedTo === undefined ? null : Number(assignedTo);
    await query(`UPDATE tasks SET assignedTo = ? WHERE id = ?`, [assignee, taskId]);
    const rows = await query(
      `SELECT t.id, t.projectId, t.assignedTo, t.title, t.status, t.dueDate, t.createdAt, t.completedAt,
              p.title AS projectTitle,
              u.name AS assigneeName
       FROM tasks t
       JOIN projects p ON p.id = t.projectId
       LEFT JOIN users u ON u.id = t.assignedTo
       WHERE t.id = ?`,
      [taskId]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { status } = req.body || {};
    const allowedStatus = ["Pending", "In Progress", "Completed"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const taskRows = await query(
      `SELECT t.id, t.projectId, t.assignedTo FROM tasks t WHERE t.id = ?`,
      [taskId]
    );
    if (!taskRows.length) return res.status(404).json({ error: "Not found" });
    const t = taskRows[0];
    const projectIds = await userProjectIds(req.user.id);
    if (!projectIds.includes(t.projectId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const isAdmin = req.user.role === "Admin";
    const isAssignee = t.assignedTo === req.user.id;
    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ error: "Only assignee or admin can update status" });
    }
    let completedAt = null;
    if (status === "Completed") {
      completedAt = new Date();
    }
    await query(
      `UPDATE tasks SET status = ?, completedAt = ? WHERE id = ?`,
      [status, completedAt, taskId]
    );
    const rows = await query(
      `SELECT t.id, t.projectId, t.assignedTo, t.title, t.status, t.dueDate, t.createdAt, t.completedAt,
              p.title AS projectTitle,
              u.name AS assigneeName
       FROM tasks t
       JOIN projects p ON p.id = t.projectId
       LEFT JOIN users u ON u.id = t.assignedTo
       WHERE t.id = ?`,
      [taskId]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
