const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00', // Store dates in UTC
  dateStrings: false,
  multipleStatements: true
};

// Database name
const dbName = process.env.DB_NAME || 'employee_attendance_system';

// Create connection pool
let pool = null;

class Database {
  // Initialize database connection
  static async initialize() {
    try {
      // First connect without database to create it
      const tempPool = mysql.createPool(dbConfig);
      
      // Create database if it doesn't exist
      await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      console.log(`✅ Database '${dbName}' created/verified`);
      
      // Close temporary connection
      await tempPool.end();
      
      // Now connect with the database
      const fullDbConfig = { ...dbConfig, database: dbName };
      pool = mysql.createPool(fullDbConfig);
      
      // Test the connection
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
      
      return pool;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  // Execute a query
  static async execute(query, params = []) {
    try {
      if (!pool) {
        await this.initialize();
      }
      
      const [rows, fields] = await pool.execute(query, params);
      return [rows, fields];
    } catch (error) {
      console.error('Database query error:', error.message);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  // Execute a query and return only rows
  static async query(query, params = []) {
    const [rows] = await this.execute(query, params);
    return rows;
  }

  // Begin transaction
  static async beginTransaction() {
    try {
      if (!pool) {
        await this.initialize();
      }
      
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      return connection;
    } catch (error) {
      console.error('Begin transaction error:', error.message);
      throw error;
    }
  }

  // Commit transaction
  static async commitTransaction(connection) {
    try {
      await connection.commit();
      connection.release();
    } catch (error) {
      console.error('Commit transaction error:', error.message);
      await this.rollbackTransaction(connection);
      throw error;
    }
  }

  // Rollback transaction
  static async rollbackTransaction(connection) {
    try {
      await connection.rollback();
      connection.release();
    } catch (error) {
      console.error('Rollback transaction error:', error.message);
      connection.release();
      throw error;
    }
  }

  // Close database connection
  static async close() {
    try {
      if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
      throw error;
    }
  }

  // Get connection status
  static getConnectionStatus() {
    return {
      isConnected: pool !== null,
      config: {
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port
      }
    };
  }

  // Health check
  static async healthCheck() {
    try {
      const [rows] = await this.execute('SELECT 1 as healthy');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        response: rows[0]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Create database tables if not exists
  static async createTables() {
    try {
      // Create users table
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('employee', 'manager') NOT NULL DEFAULT 'employee',
          employeeId VARCHAR(20) UNIQUE NOT NULL,
          department VARCHAR(100) NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_email (email),
          INDEX idx_employee_id (employeeId),
          INDEX idx_role (role),
          INDEX idx_department (department)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      // Create attendance table
      const createAttendanceTable = `
        CREATE TABLE IF NOT EXISTS attendance (
          id INT PRIMARY KEY AUTO_INCREMENT,
          userId INT NOT NULL,
          date DATE NOT NULL,
          checkInTime TIME NULL,
          checkOutTime TIME NULL,
          status ENUM('present', 'absent', 'late', 'half-day') NOT NULL DEFAULT 'absent',
          totalHours DECIMAL(4,2) DEFAULT 0.00,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_date (userId, date),
          INDEX idx_user_id (userId),
          INDEX idx_date (date),
          INDEX idx_status (status),
          INDEX idx_user_date (userId, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await this.execute(createUsersTable);
      console.log('✅ Users table created/verified');
      
      await this.execute(createAttendanceTable);
      console.log('✅ Attendance table created/verified');
      
      // Insert sample data
      await this.insertSampleData();
      
      return true;
    } catch (error) {
      console.error('❌ Error creating tables:', error.message);
      throw error;
    }
  }

  // Insert sample data
  static async insertSampleData() {
    try {
      console.log('ℹ️  Sample data insertion disabled');
      return;
    } catch (error) {
      console.error('❌ Error with sample data:', error.message);
    }
  }
}

// Export the Database class
module.exports = Database;