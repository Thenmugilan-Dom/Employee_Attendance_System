#!/usr/bin/env node

/**
 * Dashboard Service Server
 * Standalone server for dashboard endpoints
 * Port: 3002
 */

require('dotenv').config();
const DashboardServer = require('./dashboardServer');

// Create and start the dashboard server
const dashboardServer = new DashboardServer();

console.log('📊 Starting Dashboard Service...');

// Start the server
dashboardServer.start().catch(error => {
  console.error('❌ Failed to start Dashboard Server:', error);
  process.exit(1);
});