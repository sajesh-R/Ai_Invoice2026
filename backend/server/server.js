// Trigger nodemon restart after package installation
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { connectDB } = require('../config/db');
const { startScheduler } = require('../services/cronService');

// Routers
const authRoutes = require('../routes/authRoutes');
const clientRoutes = require('../routes/clientRoutes');
const invoiceRoutes = require('../routes/invoiceRoutes');
const paymentRoutes = require('../routes/paymentRoutes');
const recurringRoutes = require('../routes/recurringRoutes');

const app = express();

// Initialize Directories
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const tempPdfsDir = path.join(__dirname, '../temp_pdfs');
if (!fs.existsSync(tempPdfsDir)) {
  fs.mkdirSync(tempPdfsDir, { recursive: true });
}

// Global Middlewares
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static uploaded/generated PDFs locally (as fallback)
app.use('/uploads', express.static(uploadsDir));

// Connect Database and Run migrations/seed tables
const startServer = async () => {
  await connectDB();

  // Initialize background schedulers (Node Cron)
  startScheduler();

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/recurring', recurringRoutes);

  // Default Route
  app.get('/', (req, res) => {
    res.json({
      name: 'anraone Backend API',
      status: 'Running',
      time: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: 'Requested endpoint not found on anraone.' });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error(`Global server exception: ${err.stack}`);
    res.status(500).json({ 
      message: 'An unexpected internal server exception occurred.',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  });

  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => {
    console.log(`\n=====================================================================`);
    console.log(`🚀 anraone Server successfully running on port ${PORT}`);
    console.log(`📡 Base API Endpoint: http://localhost:${PORT}/api`);
    console.log(`=====================================================================\n`);
  });
};

startServer();
