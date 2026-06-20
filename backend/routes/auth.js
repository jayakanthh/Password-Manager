const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('Processing signup request for:', { name, email });

    // Validate input
    if (!name || !email || !password) {
      console.log('Missing required fields:', { name: !!name, email: !!email, password: !!password });
      return res.status(400).json({ 
        message: 'Please provide all required fields: name, email, and password' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Validate password length
    if (password.length < 8) {
      console.log('Password too short');
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    console.log('Creating new user...');
    // Create new user
    const user = await User.create({
      name,
      email,
      password
    });

    console.log('User created successfully:', {
      id: user.id,
      name: user.name,
      email: user.email
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Token generated successfully');

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: error.errors?.map(e => ({
        type: e.type,
        path: e.path,
        value: e.value,
        message: e.message
      })),
      sequelizeError: error.original ? {
        code: error.original.code,
        detail: error.original.detail,
        table: error.original.table,
        constraint: error.original.constraint
      } : undefined
    });
    
    // Log database connection details
    console.error('Database connection details:', {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
      NODE_ENV: process.env.NODE_ENV
    });
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors.map(e => e.message) 
      });
    }

    return res.status(500).json({ 
      message: 'Error creating user. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.isValidPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

module.exports = router;