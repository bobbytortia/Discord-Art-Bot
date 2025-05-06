const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      image_url TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function addSubmission(username, imageUrl) {
  await pool.query(
    'INSERT INTO submissions (username, image_url) VALUES ($1, $2)',
    [username, imageUrl]
  );
}

async function hasSubmitted(username) {
  const res = await pool.query(
    'SELECT 1 FROM submissions WHERE username = $1 LIMIT 1',
    [username]
  );
  return res.rowCount > 0;
}

async function getAllSubmissions() {
  const res = await pool.query('SELECT * FROM submissions');
  return res.rows;
}

async function clearSubmissions() {
  await pool.query('DELETE FROM submissions');
}

module.exports = {
  pool,
  initDB,
  addSubmission,
  hasSubmitted,
  getAllSubmissions,
  clearSubmissions
};
