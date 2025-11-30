const db = require('../../repositories/database');

class ManagerRepository {
  // Get all employees attendance records
  static async getAllEmployeeAttendance(limit = 100, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id,
          u.employeeId,
          u.name,
          u.email,
          u.department,
          a.id as attendanceId,
          a.date,
          a.checkInTime,
          a.checkOutTime,
          a.status,
          a.totalHours
        FROM users u
        LEFT JOIN attendance a ON u.id = a.userId
        WHERE u.role = 'employee'
        ORDER BY u.employeeId, a.date DESC
        LIMIT ? OFFSET ?
      `;
      
      const [records] = await db.execute(query, [limit, offset]);
      return records;
    } catch (error) {
      console.error('Error fetching all employee attendance:', error);
      throw error;
    }
  }

  // Get specific employee's attendance
  static async getEmployeeAttendance(employeeId, limit = 30, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id,
          u.employeeId,
          u.name,
          u.email,
          u.department,
          a.id as attendanceId,
          a.date,
          a.checkInTime,
          a.checkOutTime,
          a.status,
          a.totalHours
        FROM users u
        LEFT JOIN attendance a ON u.id = a.userId
        WHERE u.employeeId = ? AND u.role = 'employee'
        ORDER BY a.date DESC
        LIMIT ? OFFSET ?
      `;
      
      const [records] = await db.execute(query, [employeeId, limit, offset]);
      return records;
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  // Get team summary (all employees)
  static async getTeamSummary(month, year) {
    try {
      const query = `
        SELECT 
          u.id,
          u.employeeId,
          u.name,
          u.department,
          COUNT(a.id) as totalRecords,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentDays,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentDays,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as lateDays,
          SUM(CASE WHEN a.status = 'half-day' THEN 1 ELSE 0 END) as halfDays,
          SUM(a.totalHours) as totalWorkingHours,
          AVG(a.totalHours) as averageWorkingHours
        FROM users u
        LEFT JOIN attendance a ON u.id = a.userId 
          AND MONTH(a.date) = ? 
          AND YEAR(a.date) = ?
        WHERE u.role = 'employee'
        GROUP BY u.id, u.employeeId, u.name, u.department
        ORDER BY u.employeeId
      `;
      
      const [summary] = await db.execute(query, [month, year]);
      return summary;
    } catch (error) {
      console.error('Error fetching team summary:', error);
      throw error;
    }
  }

  // Get today's attendance status (who's checked in/out)
  static async getTodayStatus() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT 
          u.id,
          u.employeeId,
          u.name,
          u.email,
          u.department,
          a.id as attendanceId,
          a.checkInTime,
          a.checkOutTime,
          a.status,
          a.totalHours,
          CASE 
            WHEN a.checkOutTime IS NOT NULL THEN 'checked_out'
            WHEN a.checkInTime IS NOT NULL THEN 'checked_in'
            ELSE 'not_checked_in'
          END as currentStatus
        FROM users u
        LEFT JOIN attendance a ON u.id = a.userId AND a.date = ?
        WHERE u.role = 'employee'
        ORDER BY u.employeeId
      `;
      
      const [records] = await db.execute(query, [today]);
      return records;
    } catch (error) {
      console.error('Error fetching today status:', error);
      throw error;
    }
  }

  // Get attendance records for export (CSV)
  static async getAttendanceForExport(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          u.employeeId,
          u.name,
          u.email,
          u.department,
          a.date,
          a.checkInTime,
          a.checkOutTime,
          a.status,
          a.totalHours
        FROM users u
        LEFT JOIN attendance a ON u.id = a.userId
        WHERE u.role = 'employee'
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        query += ' AND a.date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      
      query += ' ORDER BY u.employeeId, a.date DESC';
      
      const [records] = await db.execute(query, params);
      return records;
    } catch (error) {
      console.error('Error fetching attendance for export:', error);
      throw error;
    }
  }

  // Get employee count
  static async getEmployeeCount() {
    try {
      const query = 'SELECT COUNT(*) as count FROM users WHERE role = ?';
      const [result] = await db.execute(query, ['employee']);
      return result[0].count;
    } catch (error) {
      console.error('Error fetching employee count:', error);
      throw error;
    }
  }

  // Get department list
  static async getDepartmentList() {
    try {
      const query = `
        SELECT DISTINCT department 
        FROM users 
        WHERE role = 'employee'
        ORDER BY department
      `;
      const [departments] = await db.execute(query);
      return departments;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  // Get employees by department
  static async getEmployeesByDepartment(department) {
    try {
      const query = `
        SELECT 
          u.id,
          u.employeeId,
          u.name,
          u.email,
          u.department,
          COUNT(a.id) as totalDays
        FROM users u
        LEFT JOIN attendance a ON u.id = a.userId
        WHERE u.role = 'employee' AND u.department = ?
        GROUP BY u.id, u.employeeId, u.name, u.email, u.department
        ORDER BY u.employeeId
      `;
      
      const [employees] = await db.execute(query, [department]);
      return employees;
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      throw error;
    }
  }
}

module.exports = ManagerRepository;
