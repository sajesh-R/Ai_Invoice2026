const User = require('../models/User');
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
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
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
    // Direct override for dev demo user
    if (email.toLowerCase() === 'demo@invoicepro.com' && password === 'password') {
      let user = await User.findOne({ email: 'demo@invoicepro.com' });
      
      if (!user) {
        user = new User({
          name: 'Demo Admin',
          email: 'demo@invoicepro.com',
          password: 'password'
        });
        await user.save();
      }

      const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({
        message: 'Login successful!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          created_at: user.created_at
        }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

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
      { id: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
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
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return using `id` for frontend compatibility
    const userData = user.toObject();
    userData.id = userData._id;

    return res.json({ user: userData });
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
