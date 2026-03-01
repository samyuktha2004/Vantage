const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  try {
    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/007_add_booking_label_inclusions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const conn = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
    if (!conn) {
      console.error('No DATABASE_URL or SUPABASE_DATABASE_URL found in .env/environment');
      process.exit(2);
    }

    const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      console.log('Applying migration: 007_add_booking_label_inclusions.sql');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Migration applied successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Migration failed:', error && error.message ? error.message : error);
    process.exit(1);
  }
})();
