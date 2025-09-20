const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create login_attempts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        attempt_number INTEGER NOT NULL,
        success BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_verification table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_verification (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        full_name VARCHAR(255) NOT NULL,
        date_of_birth DATE NOT NULL,
        address TEXT NOT NULL,
        occupation VARCHAR(100) NOT NULL,
        annual_income VARCHAR(50) NOT NULL,
        security_pin VARCHAR(255) NOT NULL,
        investment_experience VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default user
    const hashedPassword = await bcrypt.hash('correct123', 10);
    await pool.query(`
      INSERT INTO users (phone, password) 
      VALUES ($1, $2) 
      ON CONFLICT (phone) DO UPDATE SET 
        password = EXCLUDED.password,
        updated_at = CURRENT_TIMESTAMP
    `, ['+91 6398917855', hashedPassword]);

    console.log('Database setup completed successfully!');
    console.log('Default user created:');
    console.log('Phone: +91 6398917855');
    console.log('Password: correct123');
    
    process.exit(0);
  } catch (err) {
    console.error('Database setup failed:', err);
    process.exit(1);
  }
}

setupDatabase();