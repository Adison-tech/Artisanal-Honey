const { pool } = require('../config/daraja-db');

class Transaction {
  static async create(transactionData) {
    const { checkout_request_id, merchant_request_id, amount, phone_number, status } = transactionData;
    const query = `
      INSERT INTO transactions (checkout_request_id, merchant_request_id, amount, phone_number, status)
      VALUES ($1, $2, $3, $, $5)
      RETURNING *;
    `;
    const values = [checkout_request_id, merchant_request_id, amount, phone_number, status];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async updateStatus(checkout_request_id, status, mpesa_receipt_number, transaction_date, result_code, result_desc) {
    const query = `
      UPDATE transactions
      SET status = $1,
          mpesa_receipt_number = $2,
          transaction_date = $3,
          result_code = $4,
          result_desc = $5
      WHERE checkout_request_id = $6
      RETURNING *;
    `;
    const values = [status, mpesa_receipt_number, transaction_date, result_code, result_desc, checkout_request_id];
    return res.rows[0];
  }
  static async getAll() {
    const query = `SELECT * FROM transactions ORDER BY created_at DESC;`;
    const res = await pool.query(query);
    return res.rows;
  }
}

module.exports = Transaction;