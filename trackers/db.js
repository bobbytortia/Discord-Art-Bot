const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Handle pool errors (e.g., connection termination)
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:', err.message);
    console.error('Stack:', err.stack);
    // Attempt to reconnect
    setTimeout(() => {
        console.log('Attempting to reconnect to database...');
        pool.connect((connectErr, client, release) => {
            if (connectErr) {
                console.error('Reconnection failed:', connectErr.message);
            } else {
                console.log('Reconnected to database successfully');
                release();
            }
        });
    }, 5000); // Wait 5 seconds before retrying
});

// Initialize Supabase client for Storage
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                image_url TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err.message);
        throw err;
    }
}

async function addSubmission(username, imageUrl) {
    try {
        await pool.query(
            'INSERT INTO submissions (username, image_url) VALUES ($1, $2)',
            [username, imageUrl]
        );
    } catch (err) {
        console.error('Error adding submission:', err.message);
        throw err;
    }
}

async function hasSubmitted(username) {
    try {
        const res = await pool.query(
            'SELECT 1 FROM submissions WHERE username = $1 LIMIT 1',
            [username]
        );
        return res.rowCount > 0;
    } catch (err) {
        console.error('Error checking submission:', err.message);
        throw err;
    }
}

async function getAllSubmissions() {
    try {
        const res = await pool.query('SELECT * FROM submissions');
        return res.rows;
    } catch (err) {
        console.error('Error fetching submissions:', err.message);
        throw err;
    }
}

async function clearSubmissions() {
    try {
        await pool.query('DELETE FROM submissions');
    } catch (err) {
        console.error('Error clearing submissions:', err.message);
        throw err;
    }
}

module.exports = {
    pool,
    initDB,
    addSubmission,
    hasSubmitted,
    getAllSubmissions,
    clearSubmissions,
    supabase
};
