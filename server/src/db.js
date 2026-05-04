import mysql from "mysql2/promise";

function buildConfig() {
  let url =
    process.env.DATABASE_URL?.trim() || process.env.MYSQL_URL?.trim();
  if (!url && process.env.MYSQLHOST) {
    const u = encodeURIComponent(process.env.MYSQLUSER || "root");
    const p = encodeURIComponent(process.env.MYSQLPASSWORD || "");
    const h = process.env.MYSQLHOST;
    const port = process.env.MYSQLPORT || "3306";
    const db = process.env.MYSQLDATABASE || "railway";
    url = `mysql://${u}:${p}@${h}:${port}/${db}`;
  }
  if (url) {
    return { uri: url };
  }
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME || "dashboard",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

const cfg = buildConfig();

export const pool = cfg.uri
  ? mysql.createPool(cfg.uri)
  : mysql.createPool({
      ...cfg,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
