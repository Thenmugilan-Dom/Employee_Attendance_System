const express = require('express');
const cors = require('cors');
const Database = require('../../repositories/database');
const employeeRouter = require('../routers/employeeRouter');
const attendanceRouter = require('../routers/attendanceRouter');

class EmployeeServer {
  constructor() {
    this.app = express();
    this.port = process.env.EMPLOYEE_PORT || 3003;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  // Setup middleware
  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  // Setup routes
  setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await Database.healthCheck();
        res.status(200).json({
          service: 'Employee Service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: dbHealth
        });
      } catch (error) {
        res.status(500).json({
          service: 'Employee Service',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Employee routes
    this.app.use('/api/employee', employeeRouter);

    // Attendance routes
    this.app.use('/api/attendance', attendanceRouter);

    // Root route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Employee Attendance System - Employee Service',
        version: '1.0.0',
        endpoints: [
          'POST /api/employee/checkin',
          'POST /api/employee/checkout',
          'GET /api/employee/attendance',
          'GET /api/employee/profile',
          'POST /api/attendance/checkin',
          'POST /api/attendance/checkout',
          'GET /api/attendance/my-history',
          'GET /api/attendance/my-summary',
          'GET /api/attendance/today',
          'GET /health'
        ]
      });
    });
  }

  // Setup error handling
  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  // Start the server
  async start() {
    try {
      // Initialize database
      await Database.initialize();
      await Database.createTables();

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Employee Server running on port ${this.port}`);
        console.log(`📍 Employee API: http://localhost:${this.port}/api/employee`);
        console.log(`💊 Health Check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start Employee Server:', error.message);
      process.exit(1);
    }
  }

  // Shutdown server gracefully
  async shutdown() {
    console.log('\n🔄 Shutting down Employee Server...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Employee Server closed');
      });
    }

    try {
      await Database.close();
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }

    process.exit(0);
  }

  // Get Express app instance
  getApp() {
    return this.app;
  }
}

module.exports = EmployeeServer;
