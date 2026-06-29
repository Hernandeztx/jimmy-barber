const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:migueldevia50.@db.hndgnqhzaqkdrjwygtmp.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
