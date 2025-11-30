#!/usr/bin/env node

/**
 * Auth Service Server
 * Standalone server for authentication endpoints
 * Port: 3001
 */

require('dotenv').config();
const AuthServer = require('./authServer');

// Create and start the auth server
const authServer = new AuthServer();

console.log('🔐 Starting Auth Service...');

// Start the server
authServer.start().catch(error => {
  console.error('❌ Failed to start Auth Server:', error);
  process.exit(1);
});