# Database Schema Documentation

## Employee Attendance System Database Schema

This document describes the database schema for the Employee Attendance System.

### Database Structure

The system uses two main tables:
- **users**: Stores employee and manager information
- **attendance**: Stores daily attendance records

### Tables

#### Users Table
```sql
users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hashed
    role ENUM('employee', 'manager') NOT NULL DEFAULT 'employee',
    employeeId VARCHAR(20) UNIQUE NOT NULL, -- e.g., EMP001
    department VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

**Fields:**
- `id`: Primary key, auto-incrementing integer
- `name`: Employee's full name
- `email`: Unique email address for login
- `password`: Hashed password (using bcrypt)
- `role`: Either 'employee' or 'manager'
- `employeeId`: Unique identifier (EMP001 for employees, MGR001 for managers)
- `department`: Department name
- `createdAt`: Timestamp when record was created
- `updatedAt`: Timestamp when record was last modified

#### Attendance Table
```sql
attendance (
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
    UNIQUE KEY unique_user_date (userId, date)
)
```

**Fields:**
- `id`: Primary key, auto-incrementing integer
- `userId`: Foreign key referencing users.id
- `date`: Date of attendance record
- `checkInTime`: Time when employee checked in (nullable)
- `checkOutTime`: Time when employee checked out (nullable)
- `status`: Attendance status (present, absent, late, half-day)
- `totalHours`: Total working hours for the day (calculated)
- `createdAt`: Timestamp when record was created
- `updatedAt`: Timestamp when record was last modified

### Relationships

- One-to-Many: One user can have many attendance records
- Foreign Key: `attendance.userId` → `users.id` with CASCADE delete

### Indexes

**Users Table:**
- Primary key on `id`
- Unique index on `email`
- Unique index on `employeeId`
- Index on `role`
- Index on `department`

**Attendance Table:**
- Primary key on `id`
- Index on `userId`
- Index on `date`
- Index on `status`
- Composite index on `(userId, date)`
- Unique constraint on `(userId, date)` to prevent duplicate records

### Views

#### Employee Attendance Summary
Provides monthly attendance summary for each employee:
```sql
employee_attendance_summary
- userId, name, employeeId, department
- month, total_days, present_days, absent_days, late_days, half_days
- total_hours
```

#### Daily Attendance Report
Shows daily attendance details:
```sql
daily_attendance_report
- date, name, employeeId, department
- checkInTime, checkOutTime, status, totalHours
```

### Business Rules

1. **Employee ID Format**: EMP001, EMP002... for employees; MGR001, MGR002... for managers
2. **Unique Attendance**: Only one attendance record per user per date
3. **Password Security**: All passwords must be hashed using bcrypt
4. **Working Hours**: Standard 8 hours per day
5. **Late Threshold**: 15 minutes grace period before marking as late
6. **Half Day**: 4 hours or less working time

### Sample Data

The schema includes sample users and attendance records for testing:
- 5 sample users (3 employees, 2 managers)
- Sample attendance records for the current week
- Different attendance statuses (present, late, half-day)

### Stored Procedures

1. **CalculateWorkHours**: Automatically calculates total hours between check-in and check-out
2. **GetMonthlyAttendanceSummary**: Retrieves monthly attendance summary for a specific user

### Usage Notes

1. Use the SQL file (`schema.sql`) for direct database creation
2. Use the JavaScript file (`schema.js`) for programmatic access to schema definitions
3. The schema supports both MySQL and MariaDB
4. All timestamps are stored in UTC
5. Foreign key constraints ensure data integrity