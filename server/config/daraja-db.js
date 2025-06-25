const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Required for Render/Heroku PostgreSQL
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('PostgreSQL Connected');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        checkout_request_id VARCHAR(255) UNIQUE NOT NULL,
        merchant_request_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        transaction_date TIMESTAMP,
        mpesa_receipt_number VARCHAR(255),
        result_code VARCHAR(10),
        result_desc TEXT,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      `);
      console.log('Transaction table checked/created.');

  } catch (err) {
    console.error('Database connection error', err.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };