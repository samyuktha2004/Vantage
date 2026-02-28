import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
ALTER TABLE session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);
`;

try {
  await pool.query(sql);
  console.log("Session table ready");
} catch (error) {
  console.error("Failed to provision session table:", error?.message ?? error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
