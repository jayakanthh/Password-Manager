const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.last_login = data.last_login;
    this.status = data.status || 'active';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create user
  static async create(userData) {
    const { name, email, password } = userData;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [name, email, hashedPassword, 'active']
    );
    
    return new User(result.rows[0]);
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Check password
  async isValidPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Update profile (name / email / password); hashes password if provided
  static async updateProfile(id, { name, email, newPassword }) {
    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
    if (email !== undefined) { fields.push(`email = $${i++}`); values.push(email); }
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      fields.push(`password = $${i++}`);
      values.push(await bcrypt.hash(newPassword, salt));
    }

    if (fields.length === 0) return User.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Update last login
  async updateLastLogin() {
    await pool.query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [this.id]
    );
    this.last_login = new Date();
  }

  // Create users table
  static async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        last_login TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  }
}

module.exports = User;