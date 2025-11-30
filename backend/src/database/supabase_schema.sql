-- Employee Attendance System Database Schema for Supabase (PostgreSQL)
-- Created: November 30, 2025
-- Run this in Supabase SQL Editor

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for role and status
CREATE TYPE user_role AS ENUM ('employee', 'manager');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half-day');

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hashed password
    role user_role NOT NULL DEFAULT 'employee',
    employee_id VARCHAR(20) UNIQUE NOT NULL, -- e.g., EMP001
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- =============================================
-- ATTENDANCE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIME NULL,
    check_out_time TIME NULL,
    status attendance_status NOT NULL DEFAULT 'absent',
    total_hours DECIMAL(4,2) DEFAULT 0.00, -- e.g., 8.50 for 8 hours 30 minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate attendance records
    UNIQUE(user_id, date)
);

-- Create indexes for attendance table
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

-- =============================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to attendance table
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTION: Calculate work hours
-- =============================================
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to auto-calculate work hours
CREATE TRIGGER calculate_attendance_hours
    BEFORE INSERT OR UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_work_hours();

-- =============================================
-- VIEWS
-- =============================================

-- View for employee attendance summary
CREATE OR REPLACE VIEW employee_attendance_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.employee_id,
    u.department,
    TO_CHAR(a.date, 'YYYY-MM') as month,
    COUNT(*) as total_days,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
    SUM(CASE WHEN a.status = 'half-day' THEN 1 ELSE 0 END) as half_days,
    SUM(a.total_hours) as total_hours
FROM users u
LEFT JOIN attendance a ON u.id = a.user_id
GROUP BY u.id, u.name, u.employee_id, u.department, TO_CHAR(a.date, 'YYYY-MM');

-- View for daily attendance report
CREATE OR REPLACE VIEW daily_attendance_report AS
SELECT 
    a.date,
    u.name,
    u.employee_id,
    u.department,
    a.check_in_time,
    a.check_out_time,
    a.status,
    a.total_hours
FROM attendance a
JOIN users u ON a.user_id = u.id
ORDER BY a.date DESC, u.name;

-- =============================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended
-- =============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid()::text = id::text OR role = 'manager');

-- Policy: Managers can view all users
CREATE POLICY "Managers can view all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'manager'
        )
    );

-- Policy: Users can view their own attendance
CREATE POLICY "Users can view own attendance" ON attendance
    FOR SELECT
    USING (user_id::text = auth.uid()::text);

-- Policy: Users can insert their own attendance
CREATE POLICY "Users can insert own attendance" ON attendance
    FOR INSERT
    WITH CHECK (user_id::text = auth.uid()::text);

-- Policy: Users can update their own attendance
CREATE POLICY "Users can update own attendance" ON attendance
    FOR UPDATE
    USING (user_id::text = auth.uid()::text);

-- Policy: Managers can view all attendance
CREATE POLICY "Managers can view all attendance" ON attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'manager'
        )
    );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get monthly attendance summary for a user
CREATE OR REPLACE FUNCTION get_monthly_attendance_summary(
    p_user_id INTEGER,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    attendance_date DATE,
    check_in_time TIME,
    check_out_time TIME,
    status attendance_status,
    total_hours DECIMAL(4,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.status,
        a.total_hours
    FROM attendance a
    WHERE a.user_id = p_user_id 
        AND EXTRACT(YEAR FROM a.date) = p_year 
        AND EXTRACT(MONTH FROM a.date) = p_month
    ORDER BY a.date;
END;
$$ LANGUAGE plpgsql;

-- Function to get employee dashboard stats
CREATE OR REPLACE FUNCTION get_employee_dashboard_stats(p_employee_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user_id INTEGER;
    v_today DATE := CURRENT_DATE;
    v_result JSON;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM users WHERE employee_id = p_employee_id;
    
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT json_build_object(
        'user', (
            SELECT json_build_object(
                'id', id,
                'name', name,
                'email', email,
                'role', role,
                'employeeId', employee_id,
                'department', department
            ) FROM users WHERE id = v_user_id
        ),
        'today', (
            SELECT json_build_object(
                'checkInTime', check_in_time,
                'checkOutTime', check_out_time,
                'status', status,
                'totalHours', total_hours,
                'isCheckedIn', check_in_time IS NOT NULL AND check_out_time IS NULL,
                'isCheckedOut', check_out_time IS NOT NULL
            ) FROM attendance 
            WHERE user_id = v_user_id AND date = v_today
        ),
        'thisMonth', (
            SELECT json_build_object(
                'totalDays', COUNT(*),
                'presentDays', SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END),
                'absentDays', SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END),
                'lateDays', SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END),
                'halfDays', SUM(CASE WHEN status = 'half-day' THEN 1 ELSE 0 END),
                'totalWorkingHours', SUM(total_hours),
                'averageWorkingHours', ROUND(AVG(total_hours), 2)
            ) FROM attendance 
            WHERE user_id = v_user_id 
                AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM v_today)
                AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM v_today)
        ),
        'lastSevenDays', (
            SELECT json_build_object(
                'totalDays', COUNT(*),
                'presentDays', SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END),
                'totalWorkingHours', SUM(total_hours)
            ) FROM attendance 
            WHERE user_id = v_user_id AND date >= v_today - INTERVAL '7 days'
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Uncomment to insert sample data
/*
-- Insert sample users (password is 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password, role, employee_id, department) VALUES
('John Manager', 'manager@company.com', '$2a$10$rQnM8N8L3j8nPqPq1234567890abcdefghijklmnopqrstuvwxyz', 'manager', 'MGR001', 'Management'),
('Jane Employee', 'jane@company.com', '$2a$10$rQnM8N8L3j8nPqPq1234567890abcdefghijklmnopqrstuvwxyz', 'employee', 'EMP001', 'Engineering'),
('Bob Developer', 'bob@company.com', '$2a$10$rQnM8N8L3j8nPqPq1234567890abcdefghijklmnopqrstuvwxyz', 'employee', 'EMP002', 'Engineering'),
('Alice HR', 'alice@company.com', '$2a$10$rQnM8N8L3j8nPqPq1234567890abcdefghijklmnopqrstuvwxyz', 'employee', 'EMP003', 'Human Resources');

-- Insert sample attendance
INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status) VALUES
(2, CURRENT_DATE, '09:00:00', '17:30:00', 'present'),
(3, CURRENT_DATE, '09:15:00', NULL, 'present'),
(4, CURRENT_DATE, '10:00:00', '18:00:00', 'late');
*/

-- =============================================
-- GRANT PERMISSIONS (if using service role)
-- =============================================

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
