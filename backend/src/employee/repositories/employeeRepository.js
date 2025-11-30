const db = require('../../repositories/database');

class EmployeeRepository {
  // Check if employee exists in users table
  static async employeeExists(employeeId) {
    try {
      const query = 'SELECT id FROM users WHERE employeeId = ? LIMIT 1';
      const [rows] = await db.execute(query, [employeeId]);
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking employee:', error);
      throw error;
    }
  }

  // Check-in for employee
  static async checkin(employeeId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already checked in today
      const [existing] = await db.execute(
        'SELECT id FROM attendance WHERE employeeId = ? AND DATE(checkInTime) = ?',
        [employeeId, today]
      );
      
      if (existing.length > 0) {
        return null;
      }

      const checkInTime = new Date();
      const query = `
        INSERT INTO attendance (employeeId, checkInTime, date, status)
        VALUES (?, ?, ?, 'present')
      `;
      
      const [result] = await db.execute(query, [employeeId, checkInTime, today]);
      
      if (result.insertId) {
        return await this.getAttendanceById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error during check-in:', error);
      throw error;
    }
  }

  // Check-out for employee
  static async checkout(employeeId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = `
        UPDATE attendance 
        SET checkOutTime = ?, 
            workingHours = TIMESTAMPDIFF(HOUR, checkInTime, ?)
        WHERE employeeId = ? AND DATE(checkInTime) = ? AND checkOutTime IS NULL
      `;
      
      const checkOutTime = new Date();
      const [result] = await db.execute(query, [checkOutTime, checkOutTime, employeeId, today]);
      
      if (result.affectedRows > 0) {
        const [record] = await db.execute(
          'SELECT * FROM attendance WHERE employeeId = ? AND DATE(checkInTime) = ?',
          [employeeId, today]
        );
        return record[0] || null;
      }
      return null;
    } catch (error) {
      console.error('Error during check-out:', error);
      throw error;
    }
  }

  // Get attendance history for employee
  static async getAttendanceHistory(employeeId, limit = 30) {
    try {
      const query = `
        SELECT id, employeeId, date, checkInTime, checkOutTime, workingHours, status
        FROM attendance 
        WHERE employeeId = ?
        ORDER BY date DESC
        LIMIT ?
      `;
      
      const [records] = await db.execute(query, [employeeId, limit]);
      return records;
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error;
    }
  }

  // Get monthly attendance summary
  static async getAttendanceSummary(employeeId, month, year) {
    try {
      const query = `
        SELECT 
          COUNT(*) as totalDays,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
          SUM(workingHours) as totalWorkingHours,
          AVG(workingHours) as averageWorkingHours
        FROM attendance 
        WHERE employeeId = ? AND MONTH(date) = ? AND YEAR(date) = ?
      `;
      
      const [result] = await db.execute(query, [employeeId, month, year]);
      return result[0] || {};
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  }

  // Get today's attendance status
  static async getTodayAttendance(employeeId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT id, employeeId, date, checkInTime, checkOutTime, workingHours, status
        FROM attendance 
        WHERE employeeId = ? AND date = ?
        LIMIT 1
      `;
      
      const [records] = await db.execute(query, [employeeId, today]);
      return records[0] || null;
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      throw error;
    }
  }

  // Get attendance by ID
  static async getAttendanceById(id) {
    try {
      const query = `
        SELECT id, employeeId, date, checkInTime, checkOutTime, workingHours, status
        FROM attendance 
        WHERE id = ?
        LIMIT 1
      `;
      
      const [records] = await db.execute(query, [id]);
      return records[0] || null;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  }
}

module.exports = EmployeeRepository;
