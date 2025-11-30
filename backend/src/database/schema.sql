-- Employee Attendance System Database Schema
-- Created: November 29, 2025

-- Create database if not exists
-- CREATE DATABASE IF NOT EXISTS employee_attendance_system;
-- USE employee_attendance_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hashed password
    role ENUM('employee', 'manager') NOT NULL DEFAULT 'employee',
    employeeId VARCHAR(20) UNIQUE NOT NULL, -- e.g., EMP001
    department VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_email (email),
    INDEX idx_employee_id (employeeId),
    INDEX idx_role (role),
    INDEX idx_department (department)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    date DATE NOT NULL,
    checkInTime TIME NULL,
    checkOutTime TIME NULL,
    status ENUM('present', 'absent', 'late', 'half-day') NOT NULL DEFAULT 'absent',
    totalHours DECIMAL(4,2) DEFAULT 0.00, -- e.g., 8.50 for 8 hours 30 minutes
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate attendance records for the same user on the same date
    UNIQUE KEY unique_user_date (userId, date),
    
    -- Indexes for better performance
    INDEX idx_user_id (userId),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_user_date (userId, date)
);

-- Insert sample data (optional)
-- Sample users
INSERT INTO users (name, email, password, role, employeeId, department) VALUES
('John Doe', 'john.doe@company.com', '$2b$10$example_hashed_password_here', 'employee', 'EMP001', 'Engineering'),
('Jane Smith', 'jane.smith@company.com', '$2b$10$example_hashed_password_here', 'manager', 'MGR001', 'Engineering'),
('Mike Johnson', 'mike.johnson@company.com', '$2b$10$example_hashed_password_here', 'employee', 'EMP002', 'Marketing'),
('Sarah Wilson', 'sarah.wilson@company.com', '$2b$10$example_hashed_password_here', 'employee', 'EMP003', 'HR'),
('Robert Brown', 'robert.brown@company.com', '$2b$10$example_hashed_password_here', 'manager', 'MGR002', 'HR');

-- Sample attendance records
INSERT INTO attendance (userId, date, checkInTime, checkOutTime, status, totalHours) VALUES
(1, '2025-11-29', '09:00:00', '17:30:00', 'present', 8.50),
(3, '2025-11-29', '09:15:00', '17:30:00', 'late', 8.25),
(4, '2025-11-29', '09:00:00', '13:00:00', 'half-day', 4.00),
(1, '2025-11-28', '09:00:00', '17:30:00', 'present', 8.50),
(2, '2025-11-28', '08:30:00', '17:00:00', 'present', 8.50);

-- Views for common queries
-- View for employee attendance summary
CREATE VIEW employee_attendance_summary AS
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
GROUP BY u.id, u.name, u.employeeId, u.department, DATE_FORMAT(a.date, '%Y-%m');

-- View for daily attendance report
CREATE VIEW daily_attendance_report AS
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
ORDER BY a.date DESC, u.name;

-- Stored procedures for common operations
DELIMITER //

-- Procedure to calculate total hours between check-in and check-out
CREATE PROCEDURE CalculateWorkHours(
    IN p_userId INT,
    IN p_date DATE,
    IN p_checkInTime TIME,
    IN p_checkOutTime TIME
)
BEGIN
    DECLARE v_totalHours DECIMAL(4,2);
    
    IF p_checkInTime IS NOT NULL AND p_checkOutTime IS NOT NULL THEN
        SET v_totalHours = TIMESTAMPDIFF(MINUTE, p_checkInTime, p_checkOutTime) / 60.0;
        
        UPDATE attendance 
        SET totalHours = v_totalHours
        WHERE userId = p_userId AND date = p_date;
    END IF;
END//

-- Procedure to get monthly attendance summary for a user
CREATE PROCEDURE GetMonthlyAttendanceSummary(
    IN p_userId INT,
    IN p_year INT,
    IN p_month INT
)
BEGIN
    SELECT 
        DATE(date) as attendance_date,
        checkInTime,
        checkOutTime,
        status,
        totalHours
    FROM attendance
    WHERE userId = p_userId 
        AND YEAR(date) = p_year 
        AND MONTH(date) = p_month
    ORDER BY date;
END//

DELIMITER ;