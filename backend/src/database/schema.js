/**
 * Employee Attendance System Database Schema
 * JavaScript/Node.js Schema Definition
 * Created: November 29, 2025
 */

const databaseSchema = {
  // Database configuration
  database: {
    name: 'employee_attendance_system',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
  },

  // Tables definition
  tables: {
    // Users table schema
    users: {
      tableName: 'users',
      columns: {
        id: {
          type: 'INT',
          primaryKey: true,
          autoIncrement: true,
          nullable: false
        },
        name: {
          type: 'VARCHAR(255)',
          nullable: false
        },
        email: {
          type: 'VARCHAR(255)',
          nullable: false,
          unique: true
        },
        password: {
          type: 'VARCHAR(255)',
          nullable: false,
          comment: 'Hashed password using bcrypt'
        },
        role: {
          type: "ENUM('employee', 'manager')",
          nullable: false,
          default: 'employee'
        },
        employeeId: {
          type: 'VARCHAR(20)',
          nullable: false,
          unique: true,
          comment: 'Unique employee identifier, e.g., EMP001'
        },
        department: {
          type: 'VARCHAR(100)',
          nullable: false
        },
        createdAt: {
          type: 'TIMESTAMP',
          default: 'CURRENT_TIMESTAMP'
        },
        updatedAt: {
          type: 'TIMESTAMP',
          default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        }
      },
      indexes: {
        idx_email: ['email'],
        idx_employee_id: ['employeeId'],
        idx_role: ['role'],
        idx_department: ['department']
      }
    },

    // Attendance table schema
    attendance: {
      tableName: 'attendance',
      columns: {
        id: {
          type: 'INT',
          primaryKey: true,
          autoIncrement: true,
          nullable: false
        },
        userId: {
          type: 'INT',
          nullable: false,
          foreignKey: {
            table: 'users',
            column: 'id',
            onDelete: 'CASCADE'
          }
        },
        date: {
          type: 'DATE',
          nullable: false
        },
        checkInTime: {
          type: 'TIME',
          nullable: true
        },
        checkOutTime: {
          type: 'TIME',
          nullable: true
        },
        status: {
          type: "ENUM('present', 'absent', 'late', 'half-day')",
          nullable: false,
          default: 'absent'
        },
        totalHours: {
          type: 'DECIMAL(4,2)',
          default: 0.00,
          comment: 'Total working hours, e.g., 8.50 for 8 hours 30 minutes'
        },
        createdAt: {
          type: 'TIMESTAMP',
          default: 'CURRENT_TIMESTAMP'
        },
        updatedAt: {
          type: 'TIMESTAMP',
          default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        }
      },
      indexes: {
        idx_user_id: ['userId'],
        idx_date: ['date'],
        idx_status: ['status'],
        idx_user_date: ['userId', 'date']
      },
      uniqueConstraints: {
        unique_user_date: ['userId', 'date']
      }
    }
  },

  // Sample data for development/testing
  sampleData: {
    users: [
      {
        name: 'John Doe',
        email: 'john.doe@company.com',
        password: '$2b$10$example_hashed_password_here',
        role: 'employee',
        employeeId: 'EMP001',
        department: 'Engineering'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        password: '$2b$10$example_hashed_password_here',
        role: 'manager',
        employeeId: 'MGR001',
        department: 'Engineering'
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@company.com',
        password: '$2b$10$example_hashed_password_here',
        role: 'employee',
        employeeId: 'EMP002',
        department: 'Marketing'
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.wilson@company.com',
        password: '$2b$10$example_hashed_password_here',
        role: 'employee',
        employeeId: 'EMP003',
        department: 'HR'
      },
      {
        name: 'Robert Brown',
        email: 'robert.brown@company.com',
        password: '$2b$10$example_hashed_password_here',
        role: 'manager',
        employeeId: 'MGR002',
        department: 'HR'
      }
    ],
    attendance: [
      {
        userId: 1,
        date: '2025-11-29',
        checkInTime: '09:00:00',
        checkOutTime: '17:30:00',
        status: 'present',
        totalHours: 8.50
      },
      {
        userId: 3,
        date: '2025-11-29',
        checkInTime: '09:15:00',
        checkOutTime: '17:30:00',
        status: 'late',
        totalHours: 8.25
      },
      {
        userId: 4,
        date: '2025-11-29',
        checkInTime: '09:00:00',
        checkOutTime: '13:00:00',
        status: 'half-day',
        totalHours: 4.00
      },
      {
        userId: 1,
        date: '2025-11-28',
        checkInTime: '09:00:00',
        checkOutTime: '17:30:00',
        status: 'present',
        totalHours: 8.50
      },
      {
        userId: 2,
        date: '2025-11-28',
        checkInTime: '08:30:00',
        checkOutTime: '17:00:00',
        status: 'present',
        totalHours: 8.50
      }
    ]
  },

  // Database views for common queries
  views: {
    employee_attendance_summary: `
      SELECT 
        u.id as userId,
        u.name,
        u.employeeId,
        u.department,
        DATE_FORMAT(a.date, '%Y-%m') as month,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN a.status = 'half-day' THEN 1 ELSE 0 END) as half_days,
        SUM(a.totalHours) as total_hours
      FROM users u
      LEFT JOIN attendance a ON u.id = a.userId
      GROUP BY u.id, u.name, u.employeeId, u.department, DATE_FORMAT(a.date, '%Y-%m')
    `,
    
    daily_attendance_report: `
      SELECT 
        a.date,
        u.name,
        u.employeeId,
        u.department,
        a.checkInTime,
        a.checkOutTime,
        a.status,
        a.totalHours
      FROM attendance a
      JOIN users u ON a.userId = u.id
      ORDER BY a.date DESC, u.name
    `
  },

  // Validation rules
  validation: {
    users: {
      name: {
        required: true,
        minLength: 2,
        maxLength: 255
      },
      email: {
        required: true,
        format: 'email',
        unique: true
      },
      password: {
        required: true,
        minLength: 8,
        hashed: true
      },
      role: {
        required: true,
        enum: ['employee', 'manager']
      },
      employeeId: {
        required: true,
        unique: true,
        pattern: '^(EMP|MGR)\\d{3}$' // e.g., EMP001, MGR001
      },
      department: {
        required: true,
        minLength: 2,
        maxLength: 100
      }
    },
    attendance: {
      userId: {
        required: true,
        type: 'integer',
        exists: 'users.id'
      },
      date: {
        required: true,
        type: 'date'
      },
      checkInTime: {
        type: 'time',
        format: 'HH:mm:ss'
      },
      checkOutTime: {
        type: 'time',
        format: 'HH:mm:ss',
        afterField: 'checkInTime'
      },
      status: {
        required: true,
        enum: ['present', 'absent', 'late', 'half-day']
      },
      totalHours: {
        type: 'decimal',
        min: 0,
        max: 24,
        precision: 2
      }
    }
  },

  // Business logic constants
  constants: {
    WORKING_HOURS_PER_DAY: 8,
    LATE_THRESHOLD_MINUTES: 15, // 15 minutes grace period
    HALF_DAY_HOURS: 4,
    ROLES: {
      EMPLOYEE: 'employee',
      MANAGER: 'manager'
    },
    ATTENDANCE_STATUS: {
      PRESENT: 'present',
      ABSENT: 'absent',
      LATE: 'late',
      HALF_DAY: 'half-day'
    },
    EMPLOYEE_ID_PREFIX: {
      EMPLOYEE: 'EMP',
      MANAGER: 'MGR'
    }
  }
};

module.exports = databaseSchema;