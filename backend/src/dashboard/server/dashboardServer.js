const express = require('express');
const cors = require('cors');
const dashboardRouter = require('../routers/dashboardRouter');

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'supabase';

class DashboardServer {
  constructor() {
    this.app = express();
    this.port = process.env.DASHBOARD_PORT || 3002;
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
        if (DATABASE_TYPE === 'supabase') {
          res.status(200).json({
            service: 'Dashboard Service',
            status: 'healthy',
            database: 'supabase',
            timestamp: new Date().toISOString()
          });
        } else {
          const Database = require('../../repositories/database');
          const dbHealth = await Database.healthCheck();
          res.status(200).json({
            service: 'Dashboard Service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealth
          });
        }
      } catch (error) {
        res.status(500).json({
          service: 'Dashboard Service',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Dashboard routes
    this.app.use('/api/dashboard', dashboardRouter);

    // Root route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Employee Attendance System - Dashboard Service',
        version: '1.0.0',
        endpoints: [
          'GET /api/dashboard/employee',
          'GET /api/dashboard/manager',
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
      // Initialize database only for MySQL
      if (DATABASE_TYPE !== 'supabase') {
        const Database = require('../../repositories/database');
        await Database.initialize();
        await Database.createTables();
      }

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Dashboard Server running on port ${this.port}`);
        console.log(`📍 Dashboard API: http://localhost:${this.port}/api/dashboard`);
        console.log(`💊 Health Check: http://localhost:${this.port}/health`);
        console.log(`📦 Database: ${DATABASE_TYPE}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start Dashboard Server:', error.message);
      process.exit(1);
    }
  }

  // Shutdown server gracefully
  async shutdown() {
    console.log('\n🔄 Shutting down Dashboard Server...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Dashboard Server closed');
      });
    }

    if (DATABASE_TYPE !== 'supabase') {
      try {
        const Database = require('../../repositories/database');
        await Database.close();
      } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
      }
    }

    process.exit(0);
  }

  // Get Express app instance
  getApp() {
    return this.app;
  }
}

module.exports = DashboardServer;
