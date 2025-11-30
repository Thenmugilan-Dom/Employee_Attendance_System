require('dotenv').config();

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'supabase';

let db;
let supabase;

if (DATABASE_TYPE === 'supabase') {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} else {
  db = require('../../repositories/database');
}

class ManagerRepository {
  // Get all employees attendance records
  static async getAllEmployeeAttendance(limit = 100, offset = 0) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        // Get employees with their attendance
        const { data: employees, error: empError } = await supabase
          .from('users')
          .select('id, employee_id, name, email, department')
          .eq('role', 'employee');

        if (empError) throw empError;

        // Get recent attendance for each employee
        const { data: attendance, error: attError } = await supabase
          .from('attendance')
          .select('*')
          .order('date', { ascending: false })
          .range(offset, offset + limit - 1);

        if (attError) throw attError;

        // Combine data
        const records = [];
        attendance?.forEach(att => {
          const emp = employees?.find(e => e.id === att.user_id);
          if (emp) {
            records.push({
              id: emp.id,
              employeeId: emp.employee_id,
              name: emp.name,
              email: emp.email,
              department: emp.department,
              attendance: {
                id: att.id,
                date: att.date,
                checkInTime: att.check_in_time,
                checkOutTime: att.check_out_time,
                status: att.status,
                totalHours: att.total_hours || 0
              }
            });
          }
        });

        return records;
      } else {
        const query = `
          SELECT u.id, u.employeeId, u.name, u.email, u.department,
            a.id as attendanceId, a.date, a.checkInTime, a.checkOutTime, a.status, a.totalHours
          FROM users u LEFT JOIN attendance a ON u.id = a.userId
          WHERE u.role = 'employee' ORDER BY u.employeeId, a.date DESC LIMIT ? OFFSET ?
        `;
        const [records] = await db.execute(query, [limit, offset]);
        return records;
      }
    } catch (error) {
      console.error('Error fetching all employee attendance:', error);
      throw error;
    }
  }

  // Get specific employee's attendance
  static async getEmployeeAttendance(employeeId, limit = 30, offset = 0) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, employee_id, name, email, department')
          .eq('employee_id', employeeId)
          .eq('role', 'employee')
          .single();

        if (userError && userError.code !== 'PGRST116') throw userError;
        if (!user) return null;

        const { data: attendance, error: attError } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .range(offset, offset + limit - 1);

        if (attError) throw attError;

        return {
          id: user.id,
          employeeId: user.employee_id,
          name: user.name,
          email: user.email,
          department: user.department,
          attendance: (attendance || []).map(att => ({
            id: att.id,
            date: att.date,
            checkInTime: att.check_in_time,
            checkOutTime: att.check_out_time,
            status: att.status,
            totalHours: att.total_hours || 0
          }))
        };
      } else {
        const query = `
          SELECT u.id, u.employeeId, u.name, u.email, u.department,
            a.id as attendanceId, a.date, a.checkInTime, a.checkOutTime, a.status, a.totalHours
          FROM users u LEFT JOIN attendance a ON u.id = a.userId
          WHERE u.employeeId = ? AND u.role = 'employee' ORDER BY a.date DESC LIMIT ? OFFSET ?
        `;
        const [records] = await db.execute(query, [employeeId, limit, offset]);
        return records;
      }
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  // Get team summary (all employees)
  static async getTeamSummary(month, year) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const { data: employees } = await supabase
          .from('users')
          .select('id, employee_id, name, department')
          .eq('role', 'employee');

        const { data: attendance } = await supabase
          .from('attendance')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);

        const summary = employees?.map(emp => {
          const empAtt = (attendance || []).filter(a => a.user_id === emp.id);
          const totalHours = empAtt.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0);
          const presentDays = empAtt.filter(a => a.status === 'present').length;

          return {
            id: emp.id,
            employeeId: emp.employee_id,
            name: emp.name,
            department: emp.department,
            totalRecords: empAtt.length,
            presentDays,
            absentDays: empAtt.filter(a => a.status === 'absent').length,
            lateDays: empAtt.filter(a => a.status === 'late').length,
            halfDays: empAtt.filter(a => a.status === 'half-day').length,
            totalWorkingHours: totalHours,
            averageWorkingHours: presentDays > 0 ? (totalHours / presentDays).toFixed(2) : '0.00'
          };
        }) || [];

        return { month, year, employees: summary };
      } else {
        const query = `
          SELECT u.id, u.employeeId, u.name, u.department, COUNT(a.id) as totalRecords,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentDays,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentDays,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as lateDays,
            SUM(CASE WHEN a.status = 'half-day' THEN 1 ELSE 0 END) as halfDays,
            SUM(a.totalHours) as totalWorkingHours, AVG(a.totalHours) as averageWorkingHours
          FROM users u LEFT JOIN attendance a ON u.id = a.userId AND MONTH(a.date) = ? AND YEAR(a.date) = ?
          WHERE u.role = 'employee' GROUP BY u.id, u.employeeId, u.name, u.department ORDER BY u.employeeId
        `;
        const [summary] = await db.execute(query, [month, year]);
        return { month, year, employees: summary };
      }
    } catch (error) {
      console.error('Error fetching team summary:', error);
      throw error;
    }
  }

  // Get today's attendance status
  static async getTodayStatus() {
    try {
      const today = new Date().toISOString().split('T')[0];

      if (DATABASE_TYPE === 'supabase') {
        const { data: employees } = await supabase
          .from('users')
          .select('id, employee_id, name, email, department')
          .eq('role', 'employee');

        const { data: attendance } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', today);

        return employees?.map(emp => {
          const att = attendance?.find(a => a.user_id === emp.id);
          return {
            id: emp.id,
            employeeId: emp.employee_id,
            name: emp.name,
            email: emp.email,
            department: emp.department,
            checkInTime: att?.check_in_time || null,
            checkOutTime: att?.check_out_time || null,
            status: att?.status || null,
            totalHours: att?.total_hours || 0,
            currentStatus: att?.check_out_time ? 'checked_out' : (att?.check_in_time ? 'checked_in' : 'not_checked_in')
          };
        }) || [];
      } else {
        const query = `
          SELECT u.id, u.employeeId, u.name, u.email, u.department, a.id as attendanceId,
            a.checkInTime, a.checkOutTime, a.status, a.totalHours,
            CASE WHEN a.checkOutTime IS NOT NULL THEN 'checked_out'
              WHEN a.checkInTime IS NOT NULL THEN 'checked_in' ELSE 'not_checked_in' END as currentStatus
          FROM users u LEFT JOIN attendance a ON u.id = a.userId AND a.date = ?
          WHERE u.role = 'employee' ORDER BY u.employeeId
        `;
        const [records] = await db.execute(query, [today]);
        return records;
      }
    } catch (error) {
      console.error('Error fetching today status:', error);
      throw error;
    }
  }

  // Get attendance records for export
  static async getAttendanceForExport(startDate = null, endDate = null) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data: employees } = await supabase
          .from('users')
          .select('id, employee_id, name, email, department')
          .eq('role', 'employee');

        let query = supabase.from('attendance').select('*');
        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }
        query = query.order('date', { ascending: false });

        const { data: attendance } = await query;

        return (attendance || []).map(att => {
          const emp = employees?.find(e => e.id === att.user_id);
          return {
            employeeId: emp?.employee_id || '',
            name: emp?.name || '',
            email: emp?.email || '',
            department: emp?.department || '',
            date: att.date,
            checkInTime: att.check_in_time,
            checkOutTime: att.check_out_time,
            status: att.status,
            totalHours: att.total_hours || 0
          };
        });
      } else {
        let query = `
          SELECT u.employeeId, u.name, u.email, u.department, a.date, a.checkInTime, a.checkOutTime, a.status, a.totalHours
          FROM users u LEFT JOIN attendance a ON u.id = a.userId WHERE u.role = 'employee'
        `;
        const params = [];
        if (startDate && endDate) {
          query += ' AND a.date BETWEEN ? AND ?';
          params.push(startDate, endDate);
        }
        query += ' ORDER BY u.employeeId, a.date DESC';
        const [records] = await db.execute(query, params);
        return records;
      }
    } catch (error) {
      console.error('Error fetching attendance for export:', error);
      throw error;
    }
  }

  // Get employee count
  static async getEmployeeCount() {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'employee');
        if (error) throw error;
        return count || 0;
      } else {
        const query = 'SELECT COUNT(*) as count FROM users WHERE role = ?';
        const [result] = await db.execute(query, ['employee']);
        return result[0].count;
      }
    } catch (error) {
      console.error('Error fetching employee count:', error);
      throw error;
    }
  }

  // Get department list
  static async getDepartmentList() {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('users')
          .select('department')
          .eq('role', 'employee');
        if (error) throw error;
        const unique = [...new Set(data?.map(d => d.department))].sort();
        return unique.map(d => ({ department: d }));
      } else {
        const query = "SELECT DISTINCT department FROM users WHERE role = 'employee' ORDER BY department";
        const [departments] = await db.execute(query);
        return departments;
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }
}

module.exports = ManagerRepository;
