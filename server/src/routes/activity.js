import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 84));
    const userId = req.user.id;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const rows = await query(
      `SELECT DATE_FORMAT(t.completedAt, '%Y-%m-%d') AS d, COUNT(*) AS c
       FROM tasks t
       JOIN projects p ON p.id = t.projectId
       LEFT JOIN project_members pm ON pm.projectId = p.id AND pm.userId = ?
       WHERE (p.createdBy = ? OR pm.userId IS NOT NULL)
         AND t.status = 'Completed'
         AND t.completedAt IS NOT NULL
         AND t.completedAt >= ?
         AND t.completedAt <= ?
       GROUP BY DATE_FORMAT(t.completedAt, '%Y-%m-%d')`,
      [userId, userId, start, end]
    );
    const map = new Map(rows.map((r) => [String(r.d), Number(r.c)]));
    const out = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      out.push({ date: key, count: map.get(key) || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
