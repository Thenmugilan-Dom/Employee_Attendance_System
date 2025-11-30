// Combined server for production deployment (Render, etc.)
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routers
const authRouter = require('./auth/routers/authRouter');
const dashboardRouter = require('./dashboard/routers/dashboardRouter');
const attendanceRouter = require('./employee/routers/attendanceRouter');
const employeeRouter = require('./employee/routers/employeeRouter');
const managerRouter = require('./manager/routers/managerRouter');

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/manager', managerRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Employee Attendance System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      attendance: '/api/attendance',
      employee: '/api/employee',
      manager: '/api/manager'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Combined server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
