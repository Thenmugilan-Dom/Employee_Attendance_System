const express = require('express');
const cors = require('cors');
const Database = require('../../repositories/database');
const authRouter = require('../routers/authRouter');
const authRepository = require('../repositories/authRepository');

class AuthServer {
  constructor() {
    this.app = express();
    this.port = process.env.AUTH_PORT || 3001;
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
          service: 'Auth Service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: dbHealth
        });
      } catch (error) {
        res.status(500).json({
          service: 'Auth Service',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Auth routes
    this.app.use('/api/auth', authRouter);
    
    // Clear all users endpoint (for development only)
    this.app.delete('/api/auth/clear-users', async (req, res) => {
      try {
        const db = require('../../repositories/database');
        await db.execute('DELETE FROM users');
        await db.execute('ALTER TABLE users AUTO_INCREMENT = 1');
        res.status(200).json({ message: 'All users cleared successfully' });
      } catch (error) {
        console.error('Clear users error:', error);
        res.status(500).json({ error: 'Failed to clear users' });
      }
    });

    // Sample data endpoint for testing
    this.app.get('/api/auth/sample', (req, res) => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      // Generate a sample JWT token for testing
      const sampleTokenPayload = {
        id: 1,
        email: "thenmugilan@company.com",
        role: "employee",
        employeeId: "EMP001",
        department: "Engineering"
      };
      
      const sampleJwtToken = jwt.sign(sampleTokenPayload, JWT_SECRET, { expiresIn: '24h' });
      
      res.status(200).json({
        register: {
          method: 'POST',
          url: 'http://localhost:3001/api/auth/register',
          body: {
            name: "Thenmugilan",
            email: "thenmugilan@company.com",
            password: "1234",
            role: "employee",
            employeeId: "EMP001",
            department: "Engineering"
          }
        },
        login: {
          method: 'POST',
          url: 'http://localhost:3001/api/auth/login',
          body: {
            email: "thenmugilan@company.com",
            password: "1234"
          }
        },
        getUser: {
          method: 'GET',
          url: 'http://localhost:3001/api/auth/me',
          headers: {
            Authorization: `Bearer ${sampleJwtToken}`
          }
        },
        sampleJwtToken: sampleJwtToken,
        note: "Use the sampleJwtToken above in the Authorization header for testing /me endpoint"
      });
    });

    // Root route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Employee Attendance System - Auth Service',
        version: '1.0.0',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login', 
          'GET /api/auth/me',
          'GET /api/auth/sample',
          'GET /health'
        ],
        sampleData: {
          name: "Thenmugilan",
          email: "thenmugilan@gmail.com",
          password: "1234",
          role: "employee",
          employeeId: "EMP001",
          department: "Engineering"
        }
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
        console.log(`🚀 Auth Server running on port ${this.port}`);
        console.log(`📍 Auth API: http://localhost:${this.port}/api/auth`);
        console.log(`💊 Health Check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start Auth Server:', error.message);
      process.exit(1);
    }
  }

  // Shutdown server gracefully
  async shutdown() {
    console.log('\n🔄 Shutting down Auth Server...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Auth Server closed');
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

module.exports = AuthServer;