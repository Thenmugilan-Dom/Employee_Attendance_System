const db = require('../../repositories/database');

class DashboardRepository {
  // Get employee dashboard stats
  static async getEmployeeDashboardStats(employeeId) {
    try {
      // Get user info
      const [userRows] = await db.execute(
        'SELECT id, name, email, role, employeeId, department FROM users WHERE employeeId = ?',
        [employeeId]
      );
      
      if (userRows.length === 0) {
        return null;
      }

      const user = userRows[0];
      const userId = user.id;
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Today's stats
      const [todayRows] = await db.execute(
        `SELECT checkInTime, checkOutTime, status, totalHours 
         FROM attendance 
         WHERE userId = ? AND date = ?`,
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
        checkInTime: null,
        checkOutTime: null,
        status: 'absent',
        totalHours: 0,
        isCheckedIn: false,
        isCheckedOut: false
      };

      // This month's stats
      const [monthlyRows] = await db.execute(
        `SELECT 
          COUNT(*) as totalDays,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lateDays,
          SUM(CASE WHEN status = 'half-day' THEN 1 ELSE 0 END) as halfDays,
          SUM(totalHours) as totalWorkingHours,
          AVG(totalHours) as averageWorkingHours
         FROM attendance 
         WHERE userId = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
        [userId, currentMonth, currentYear]
      );

      const monthlyStats = monthlyRows[0];

      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const [weeklyRows] = await db.execute(
        `SELECT 
          COUNT(*) as totalDays,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
          SUM(totalHours) as totalWorkingHours
         FROM attendance 
         WHERE userId = ? AND date >= ?`,
        [userId, sevenDaysAgoStr]
      );

      const weeklyStats = weeklyRows[0];

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department
        },
        today: todayStats,
        thisMonth: {
          totalDays: monthlyStats.totalDays || 0,
          presentDays: monthlyStats.presentDays || 0,
          absentDays: monthlyStats.absentDays || 0,
          lateDays: monthlyStats.lateDays || 0,
          halfDays: monthlyStats.halfDays || 0,
          totalWorkingHours: monthlyStats.totalWorkingHours || 0,
          averageWorkingHours: parseFloat(monthlyStats.averageWorkingHours || 0).toFixed(2)
        },
        lastSevenDays: {
          totalDays: weeklyStats.totalDays || 0,
          presentDays: weeklyStats.presentDays || 0,
          totalWorkingHours: weeklyStats.totalWorkingHours || 0
        }
      };
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

      // Total employees
      const [empCountRows] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['employee']
      );

      const totalEmployees = empCountRows[0].count;

      // Today's attendance
      const [todayAttendanceRows] = await db.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.checkInTime IS NOT NULL THEN 1 ELSE 0 END) as checkedIn,
          SUM(CASE WHEN a.checkOutTime IS NOT NULL THEN 1 ELSE 0 END) as checkedOut,
          SUM(CASE WHEN a.date = ? AND a.checkInTime IS NULL THEN 1 ELSE 0 END) as absent
         FROM users u
         LEFT JOIN attendance a ON u.id = a.userId AND a.date = ?
         WHERE u.role = ?`,
        [today, today, 'employee']
      );

      const todayAttendance = todayAttendanceRows[0];

      // This month's stats
      const [monthlyRows] = await db.execute(
        `SELECT 
          COUNT(DISTINCT u.id) as totalEmployees,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN u.id END) as employeesPresent,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentRecords,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentRecords,
          SUM(a.totalHours) as totalWorkingHours,
          AVG(a.totalHours) as averageWorkingHours
         FROM users u
         LEFT JOIN attendance a ON u.id = a.userId 
           AND MONTH(a.date) = ? 
           AND YEAR(a.date) = ?
         WHERE u.role = ?`,
        [currentMonth, currentYear, 'employee']
      );

      const monthlyStats = monthlyRows[0];

      // Departments list with counts
      const [deptRows] = await db.execute(
        `SELECT 
          u.department,
          COUNT(u.id) as employeeCount,
          SUM(CASE WHEN a.status = 'present' AND DATE(a.date) = ? THEN 1 ELSE 0 END) as presentToday
         FROM users u
         LEFT JOIN attendance a ON u.id = a.userId
         WHERE u.role = ?
         GROUP BY u.department
         ORDER BY u.department`,
        [today, 'employee']
      );

      return {
        summary: {
          totalEmployees: totalEmployees,
          todayCheckedIn: todayAttendance.checkedIn || 0,
          todayCheckedOut: todayAttendance.checkedOut || 0,
          todayAbsent: totalEmployees - (todayAttendance.checkedIn || 0)
        },
        thisMonth: {
          totalEmployees: monthlyStats.totalEmployees || 0,
          employeesPresent: monthlyStats.employeesPresent || 0,
          presentRecords: monthlyStats.presentRecords || 0,
          absentRecords: monthlyStats.absentRecords || 0,
          totalWorkingHours: monthlyStats.totalWorkingHours || 0,
          averageWorkingHours: parseFloat(monthlyStats.averageWorkingHours || 0).toFixed(2)
        },
        departments: deptRows.map(dept => ({
          name: dept.department,
          employeeCount: dept.employeeCount,
          presentToday: dept.presentToday || 0
        }))
      };
    } catch (error) {
      console.error('Error fetching manager dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = DashboardRepository;
