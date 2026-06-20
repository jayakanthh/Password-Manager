const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize database connection
const { testConnection } = require('../backend/config/database');

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check if the origin matches our allowed patterns
    const allowedOrigins = [
      'http://localhost:5173',
      'https://password-manager-six-psi.vercel.app',
      'https://cipher-safe-frontend.vercel.app',
      'https://cipherrsafee.vercel.app',
      'https://ciphersafee.vercel.app'
    ];

    const isAllowed = allowedOrigins.includes(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'online',
    message: 'Password Manager API is running on Vercel',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      passwords: '/api/passwords',
      users: '/api/users'
    }
  });
});

// Health check / keep-alive: runs a real DB query so Supabase counts it as
// activity and does not pause the free-tier project. Hit daily by a Vercel Cron.
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, db: dbOk ? 'up' : 'down', ts: new Date().toISOString() });
});

// Import and use routes
const authRoutes = require('../backend/routes/auth');
const passwordRoutes = require('../backend/routes/passwords');
const userRoutes = require('../backend/routes/users');

// Mount under /api/* to match Vercel rewrite
app.use('/api/auth', authRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Test database connection before starting the server
testConnection()
  .then(connected => {
    if (!connected) {
      console.error('Failed to connect to database. API may not function correctly.');
    } else {
      console.log('Database connection successful. API ready to handle requests.');
    }
  })
  .catch(err => {
    console.error('Error testing database connection:', err);
  });

// Export for Vercel
module.exports = app;