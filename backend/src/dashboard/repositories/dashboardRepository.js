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

class DashboardRepository {
  // Get employee dashboard stats
  static async getEmployeeDashboardStats(employeeId) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        // Get user info
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, name, email, role, employee_id, department')
          .eq('employee_id', employeeId)
          .single();

        if (userError && userError.code !== 'PGRST116') throw userError;
        if (!user) return null;

        const userId = user.id;
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Today's attendance
        const { data: todayData } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        const todayStats = todayData ? {
          checkInTime: todayData.check_in_time,
          checkOutTime: todayData.check_out_time,
          status: todayData.status,
          totalHours: todayData.total_hours || 0,
          isCheckedIn: todayData.check_in_time !== null && todayData.check_out_time === null,
          isCheckedOut: todayData.check_out_time !== null
        } : {
          checkInTime: null,
          checkOutTime: null,
          status: 'absent',
          totalHours: 0,
          isCheckedIn: false,
          isCheckedOut: false
        };

        // This month's stats
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

        const { data: monthlyData } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate);

        const monthlyRecords = monthlyData || [];
        const monthlyStats = {
          totalDays: monthlyRecords.length,
          presentDays: monthlyRecords.filter(a => a.status === 'present').length,
          absentDays: monthlyRecords.filter(a => a.status === 'absent').length,
          lateDays: monthlyRecords.filter(a => a.status === 'late').length,
          halfDays: monthlyRecords.filter(a => a.status === 'half-day').length,
          totalWorkingHours: monthlyRecords.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0),
          averageWorkingHours: 0
        };
        if (monthlyStats.presentDays > 0) {
          monthlyStats.averageWorkingHours = (monthlyStats.totalWorkingHours / monthlyStats.presentDays).toFixed(2);
        }

        // Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: weeklyData } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

        const weeklyRecords = weeklyData || [];

        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: user.employee_id,
            department: user.department
          },
          today: todayStats,
          thisMonth: monthlyStats,
          lastSevenDays: {
            totalDays: weeklyRecords.length,
            presentDays: weeklyRecords.filter(a => a.status === 'present').length,
            totalWorkingHours: weeklyRecords.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0)
          }
        };
      } else {
        // MySQL logic (existing code)
        const [userRows] = await db.execute(
          'SELECT id, name, email, role, employeeId, department FROM users WHERE employeeId = ?',
          [employeeId]
        );
        
        if (userRows.length === 0) return null;

        const user = userRows[0];
        const userId = user.id;
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const [todayRows] = await db.execute(
          'SELECT checkInTime, checkOutTime, status, totalHours FROM attendance WHERE userId = ? AND date = ?',
          [userId, today]
        );

        const todayStats = todayRows.length > 0 ? {
          checkInTime: todayRows[0].checkInTime,
          checkOutTime: todayRows[0].checkOutTime,
          status: todayRows[0].status,
          totalHours: todayRows[0].totalHours,
          isCheckedIn: todayRows[0].checkInTime !== null && todayRows[0].checkOutTime === null,
          isCheckedOut: todayRows[0].checkOutTime !== null
        } : {
          checkInTime: null, checkOutTime: null, status: 'absent', totalHours: 0, isCheckedIn: false, isCheckedOut: false
        };

        const [monthlyRows] = await db.execute(
          `SELECT COUNT(*) as totalDays, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lateDays,
           SUM(CASE WHEN status = 'half-day' THEN 1 ELSE 0 END) as halfDays,
           SUM(totalHours) as totalWorkingHours, AVG(totalHours) as averageWorkingHours
           FROM attendance WHERE userId = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
          [userId, currentMonth, currentYear]
        );

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [weeklyRows] = await db.execute(
          `SELECT COUNT(*) as totalDays, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
           SUM(totalHours) as totalWorkingHours FROM attendance WHERE userId = ? AND date >= ?`,
          [userId, sevenDaysAgo.toISOString().split('T')[0]]
        );

        return {
          user: { id: user.id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId, department: user.department },
          today: todayStats,
          thisMonth: {
            totalDays: monthlyRows[0].totalDays || 0,
            presentDays: monthlyRows[0].presentDays || 0,
            absentDays: monthlyRows[0].absentDays || 0,
            lateDays: monthlyRows[0].lateDays || 0,
            halfDays: monthlyRows[0].halfDays || 0,
            totalWorkingHours: monthlyRows[0].totalWorkingHours || 0,
            averageWorkingHours: parseFloat(monthlyRows[0].averageWorkingHours || 0).toFixed(2)
          },
          lastSevenDays: {
            totalDays: weeklyRows[0].totalDays || 0,
            presentDays: weeklyRows[0].presentDays || 0,
            totalWorkingHours: weeklyRows[0].totalWorkingHours || 0
          }
        };
      }
    } catch (error) {
      console.error('Error fetching employee dashboard stats:', error);
      throw error;
    }
  }

  // Get manager dashboard stats
  static async getManagerDashboardStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      if (DATABASE_TYPE === 'supabase') {
        // Get all employees
        const { data: employees, error: empError } = await supabase
          .from('users')
          .select('id, employee_id, name, department')
          .eq('role', 'employee');

        if (empError) throw empError;
        const totalEmployees = employees?.length || 0;

        // Get today's attendance
        const { data: todayAttendance } = await supabase
          .from('attendance')
          .select('user_id, check_in_time, check_out_time, status')
          .eq('date', today);

        const todayRecords = todayAttendance || [];
        const checkedIn = todayRecords.filter(a => a.check_in_time).length;
        const checkedOut = todayRecords.filter(a => a.check_out_time).length;

        // This month's stats
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

        const { data: monthlyData } = await supabase
          .from('attendance')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);

        const monthlyRecords = monthlyData || [];
        const presentRecords = monthlyRecords.filter(a => a.status === 'present').length;
        const absentRecords = monthlyRecords.filter(a => a.status === 'absent').length;
        const totalHours = monthlyRecords.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0);

        // Departments
        const departments = {};
        employees?.forEach(emp => {
          if (!departments[emp.department]) {
            departments[emp.department] = { employeeCount: 0, presentToday: 0 };
          }
          departments[emp.department].employeeCount++;
        });

        todayRecords.forEach(att => {
          const emp = employees?.find(e => e.id === att.user_id);
          if (emp && att.check_in_time && departments[emp.department]) {
            departments[emp.department].presentToday++;
          }
        });

        return {
          summary: {
            totalEmployees,
            todayCheckedIn: checkedIn,
            todayCheckedOut: checkedOut,
            todayAbsent: totalEmployees - checkedIn
          },
          thisMonth: {
            totalEmployees,
            employeesPresent: new Set(monthlyRecords.filter(a => a.status === 'present').map(a => a.user_id)).size,
            presentRecords,
            absentRecords,
            totalWorkingHours: totalHours,
            averageWorkingHours: monthlyRecords.length > 0 ? (totalHours / monthlyRecords.length).toFixed(2) : '0.00'
          },
          departments: Object.entries(departments).map(([name, data]) => ({
            name,
            employeeCount: data.employeeCount,
            presentToday: data.presentToday
          }))
        };
      } else {
        // MySQL logic
        const [empCountRows] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['employee']);
        const totalEmployees = empCountRows[0].count;

        const [todayAttendanceRows] = await db.execute(
          `SELECT COUNT(*) as total, SUM(CASE WHEN a.checkInTime IS NOT NULL THEN 1 ELSE 0 END) as checkedIn,
           SUM(CASE WHEN a.checkOutTime IS NOT NULL THEN 1 ELSE 0 END) as checkedOut
           FROM users u LEFT JOIN attendance a ON u.id = a.userId AND a.date = ? WHERE u.role = ?`,
          [today, 'employee']
        );

        const [monthlyRows] = await db.execute(
          `SELECT COUNT(DISTINCT u.id) as totalEmployees, COUNT(DISTINCT CASE WHEN a.status = 'present' THEN u.id END) as employeesPresent,
           SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentRecords, SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentRecords,
           SUM(a.totalHours) as totalWorkingHours, AVG(a.totalHours) as averageWorkingHours
           FROM users u LEFT JOIN attendance a ON u.id = a.userId AND MONTH(a.date) = ? AND YEAR(a.date) = ? WHERE u.role = ?`,
          [currentMonth, currentYear, 'employee']
        );

        const [deptRows] = await db.execute(
          `SELECT u.department, COUNT(DISTINCT u.id) as employeeCount,
           SUM(CASE WHEN a.status = 'present' AND a.date = ? THEN 1 ELSE 0 END) as presentToday
           FROM users u LEFT JOIN attendance a ON u.id = a.userId WHERE u.role = ? GROUP BY u.department ORDER BY u.department`,
          [today, 'employee']
        );

        return {
          summary: {
            totalEmployees,
            todayCheckedIn: todayAttendanceRows[0].checkedIn || 0,
            todayCheckedOut: todayAttendanceRows[0].checkedOut || 0,
            todayAbsent: totalEmployees - (todayAttendanceRows[0].checkedIn || 0)
          },
          thisMonth: {
            totalEmployees: monthlyRows[0].totalEmployees || 0,
            employeesPresent: monthlyRows[0].employeesPresent || 0,
            presentRecords: monthlyRows[0].presentRecords || 0,
            absentRecords: monthlyRows[0].absentRecords || 0,
            totalWorkingHours: monthlyRows[0].totalWorkingHours || 0,
            averageWorkingHours: parseFloat(monthlyRows[0].averageWorkingHours || 0).toFixed(2)
          },
          departments: deptRows.map(dept => ({ name: dept.department, employeeCount: dept.employeeCount, presentToday: dept.presentToday || 0 }))
        };
      }
    } catch (error) {
      console.error('Error fetching manager dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = DashboardRepository;
