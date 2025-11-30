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
      // Check if sample data already exists
      const [existingUsers] = await this.execute('SELECT COUNT(*) as count FROM users');
      if (existingUsers[0].count > 0) {
        console.log('📊 Sample data already exists, skipping insertion');
        return;
      }

      const bcrypt = require('bcryptjs');

      // Sample users with hashed passwords
      const sampleUsers = [
        {
          name: 'Thenmugilan',
          email: 'thenmugilan@company.com',
          password: await bcrypt.hash('1234', 10),
          role: 'employee',
          employeeId: 'EMP001',
          department: 'Engineering'
        },
        {
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          password: await bcrypt.hash('password123', 10),
          role: 'manager',
          employeeId: 'MGR001',
          department: 'Engineering'
        },
        {
          name: 'Mike Johnson',
          email: 'mike.johnson@company.com',
          password: await bcrypt.hash('mike123', 10),
          role: 'employee',
          employeeId: 'EMP002',
          department: 'Marketing'
        },
        {
          name: 'Sarah Wilson',
          email: 'sarah.wilson@company.com',
          password: await bcrypt.hash('sarah123', 10),
          role: 'employee',
          employeeId: 'EMP003',
          department: 'HR'
        },
        {
          name: 'Robert Brown',
          email: 'robert.brown@company.com',
          password: await bcrypt.hash('robert123', 10),
          role: 'manager',
          employeeId: 'MGR002',
          department: 'HR'
        }
      ];

      // Insert sample users
      for (const user of sampleUsers) {
        const insertUserQuery = `
          INSERT INTO users (name, email, password, role, employeeId, department)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await this.execute(insertUserQuery, [
          user.name,
          user.email,
          user.password,
          user.role,
          user.employeeId,
          user.department
        ]);
      }
      console.log('✅ Sample users inserted');

      // Sample attendance records
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const sampleAttendance = [
        {
          userId: 1, // Thenmugilan
          date: today.toISOString().split('T')[0],
          checkInTime: '09:00:00',
          checkOutTime: '17:30:00',
          status: 'present',
          totalHours: 8.50
        },
        {
          userId: 3, // Mike Johnson
          date: today.toISOString().split('T')[0],
          checkInTime: '09:15:00',
          checkOutTime: '17:30:00',
          status: 'late',
          totalHours: 8.25
        },
        {
          userId: 4, // Sarah Wilson
          date: today.toISOString().split('T')[0],
          checkInTime: '09:00:00',
          checkOutTime: '13:00:00',
          status: 'half-day',
          totalHours: 4.00
        },
        {
          userId: 1, // Thenmugilan
          date: yesterday.toISOString().split('T')[0],
          checkInTime: '09:00:00',
          checkOutTime: '17:30:00',
          status: 'present',
          totalHours: 8.50
        },
        {
          userId: 2, // Jane Smith
          date: yesterday.toISOString().split('T')[0],
          checkInTime: '08:30:00',
          checkOutTime: '17:00:00',
          status: 'present',
          totalHours: 8.50
        }
      ];

      // Insert sample attendance
      for (const attendance of sampleAttendance) {
        const insertAttendanceQuery = `
          INSERT INTO attendance (userId, date, checkInTime, checkOutTime, status, totalHours)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await this.execute(insertAttendanceQuery, [
          attendance.userId,
          attendance.date,
          attendance.checkInTime,
          attendance.checkOutTime,
          attendance.status,
          attendance.totalHours
        ]);
      }
      console.log('✅ Sample attendance records inserted');

    } catch (error) {
      console.error('❌ Error inserting sample data:', error.message);
      // Don't throw error, just log it so server can continue
    }
  }
}

// Export the Database class
module.exports = Database;