#!/usr/bin/env node

/**
 * Manager Service Server
 * Standalone server for manager endpoints
 * Port: 3004
 */

require('dotenv').config();
const ManagerServer = require('./managerServer');

// Create and start the manager server
const managerServer = new ManagerServer();

console.log('👔 Starting Manager Service...');

// Start the server
managerServer.start().catch(error => {
  console.error('❌ Failed to start Manager Server:', error);
  process.exit(1);
});