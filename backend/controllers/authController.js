const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123456789';

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields (name, email, password) are required.' });
  }

  try {
    // Check if user exists
    const checkQuery = 'SELECT * FROM users WHERE email = $1';
    const checkRes = await db.query(checkQuery, [email.toLowerCase()]);

    if (checkRes.rowCount > 0) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const insertQuery = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;
    const result = await db.query(insertQuery, [name, email.toLowerCase(), hashedPassword]);
    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user
    });
  } catch (error) {
    console.error(`Auth Register Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Direct override for dev demo user (bypasses DB password checks entirely!)
    if (email.toLowerCase() === 'demo@invoicepro.com' && password === 'password') {
      let userId = 1;
      
      try {
        const checkQuery = "SELECT id FROM users WHERE email = 'demo@invoicepro.com'";
        const checkRes = await db.query(checkQuery);
        if (checkRes.rowCount > 0) {
          userId = checkRes.rows[0].id;
        } else {
          // Seed the user dynamically in the DB if they aren't there yet
          const insertQuery = `
            INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id
          `;
          const insertRes = await db.query(insertQuery, [
            'Demo Admin',
            'demo@invoicepro.com',
            'password'
          ]);
          userId = insertRes.rows[0].id;
        }
      } catch (dbErr) {
        console.warn("Demo dynamic database ID lookup skipped:", dbErr.message);
      }

      const token = jwt.sign(
        { id: userId, name: 'Demo Admin', email: 'demo@invoicepro.com' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({
        message: 'Login successful!',
        token,
        user: {
          id: userId,
          name: 'Demo Admin',
          email: 'demo@invoicepro.com',
          created_at: new Date().toISOString()
        }
      });
    }

    const findQuery = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(findQuery, [email.toLowerCase()]);

    if (result.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check password
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error(`Auth Login Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
};

const getMe = async (req, res) => {
  try {
    const findQuery = 'SELECT id, name, email, created_at FROM users WHERE id = $1';
    const result = await db.query(findQuery, [req.user.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(`Auth getMe Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error fetching user profile.' });
  }
};

module.exports = {
  register,
  login,
  getMe
};
