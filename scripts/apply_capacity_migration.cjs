const { Pool } = require('pg');
const fs = require('fs');

(async () => {
  try {
    const sql = fs.readFileSync('supabase/migrations/006_add_event_capacity.sql', 'utf8');
    const conn = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
    if (!conn) {
      console.error('No DATABASE_URL or SUPABASE_DATABASE_URL found in environment');
      process.exit(2);
    }

    const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    try {
      console.log('Applying SQL:\n', sql);
      await client.query(sql);
      console.log('Migration applied successfully');
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
