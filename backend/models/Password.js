const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto');

class Password {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.username = data.username;
    this.password = data.password;
    this.url = data.url;
    this.user_id = data.user_id;
    this.last_used = data.last_used;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Build a Password from a DB row, decrypting the stored secret.
  static fromRow(row) {
    if (!row) return null;
    return new Password({ ...row, password: decrypt(row.password) });
  }

  // Create password
  static async create(passwordData) {
    const { title, username, password, url, user_id, notes } = passwordData;

    const result = await pool.query(
      'INSERT INTO passwords (title, username, password, url, user_id, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [title, username, encrypt(password), url || null, user_id, notes || null]
    );

    return Password.fromRow(result.rows[0]);
  }

  // Find passwords by user ID
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM passwords WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(row => Password.fromRow(row));
  }

  // Find password by ID and user ID
  static async findByIdAndUserId(id, userId) {
    const result = await pool.query(
      'SELECT * FROM passwords WHERE id = $1 AND user_id = $2 LIMIT 1',
      [id, userId]
    );

    return result.rows.length > 0 ? Password.fromRow(result.rows[0]) : null;
  }

  // Update password
  static async updateById(id, userId, updateData) {
    const { title, username, password, url, notes } = updateData;

    const result = await pool.query(
      'UPDATE passwords SET title = $1, username = $2, password = $3, url = $4, notes = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING *',
      [title, username, encrypt(password), url || null, notes || null, id, userId]
    );

    return result.rows.length > 0 ? Password.fromRow(result.rows[0]) : null;
  }

  // Delete password
  static async deleteById(id, userId) {
    const result = await pool.query(
      'DELETE FROM passwords WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    return result.rows.length > 0;
  }

  // Update last used
  async updateLastUsed() {
    await pool.query(
      'UPDATE passwords SET last_used = NOW(), updated_at = NOW() WHERE id = $1',
      [this.id]
    );
    this.last_used = new Date();
  }

  // Create passwords table
  static async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS passwords (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password TEXT NOT NULL,
        url VARCHAR(500),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_used TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_passwords_user_id ON passwords(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_passwords_title ON passwords(title)');
  }
}

module.exports = Password;