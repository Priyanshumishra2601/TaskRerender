import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query(
      `SELECT t.status, t.dueDate
       FROM tasks t
       JOIN projects p ON p.id = t.projectId
       LEFT JOIN project_members pm ON pm.projectId = p.id AND pm.userId = ?
       WHERE p.createdBy = ? OR pm.userId IS NOT NULL`,
      [userId, userId]
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let total = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    for (const r of rows) {
      total += 1;
      if (r.status === "Completed") {
        completed += 1;
        continue;
      }
      let late = false;
      if (r.dueDate) {
        const d = new Date(r.dueDate);
        d.setHours(0, 0, 0, 0);
        if (d < today) late = true;
      }
      if (late) overdue += 1;
      else pending += 1;
    }
    res.json({ totalTasks: total, completedTasks: completed, pendingTasks: pending, overdueTasks: overdue });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
