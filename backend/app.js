const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/passwords');
const userRoutes = require('./routes/users');

const app = express();

// CORS configuration with origin validation
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
      'https://cipherrsafee.vercel.app'
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
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

// Debug middleware - Log all requests including CORS details
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Password Manager API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      passwords: '/api/passwords',
      users: '/api/users'
    }
  });
});

// Simple ping endpoint for testing
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend API is working',
    timestamp: new Date().toISOString()
  });
});

// Routes
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

module.exports = app;