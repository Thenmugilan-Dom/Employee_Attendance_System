const managerRepository = require('../repositories/managerRepository');

class ManagerController {
  // GET /api/manager/attendance/all - All employees attendance
  static async getAllEmployeeAttendance(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      const records = await managerRepository.getAllEmployeeAttendance(parseInt(limit), parseInt(offset));
      
      res.status(200).json(records.map(record => ({
        id: record.id,
        employeeId: record.employeeId,
        name: record.name,
        email: record.email,
        department: record.department,
        attendance: {
          id: record.attendanceId,
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          status: record.status,
          totalHours: record.totalHours
        }
      })));
    } catch (error) {
      console.error('Error fetching all employees attendance:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/manager/attendance/employee/:id - Specific employee attendance
  static async getEmployeeAttendance(req, res) {
    try {
      const { id } = req.params;
      const { limit = 30, offset = 0 } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      const records = await managerRepository.getEmployeeAttendance(id, parseInt(limit), parseInt(offset));
      
      if (records.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Group by employee info and map attendance records
      const employee = {
        id: records[0].id,
        employeeId: records[0].employeeId,
        name: records[0].name,
        email: records[0].email,
        department: records[0].department,
        attendance: records.map(record => ({
          id: record.attendanceId,
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          status: record.status,
          totalHours: record.totalHours
        }))
      };

      res.status(200).json(employee);
    } catch (error) {
      console.error('Error fetching employee attendance:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/manager/attendance/summary - Team summary
  static async getTeamSummary(req, res) {
    try {
      const { month, year } = req.query;
      
      const currentDate = new Date();
      const monthParam = month ? parseInt(month) : currentDate.getMonth() + 1;
      const yearParam = year ? parseInt(year) : currentDate.getFullYear();

      const summary = await managerRepository.getTeamSummary(monthParam, yearParam);
      
      res.status(200).json({
        month: monthParam,
        year: yearParam,
        employees: summary.map(emp => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          totalRecords: emp.totalRecords || 0,
          presentDays: emp.presentDays || 0,
          absentDays: emp.absentDays || 0,
          lateDays: emp.lateDays || 0,
          halfDays: emp.halfDays || 0,
          totalWorkingHours: emp.totalWorkingHours || 0,
          averageWorkingHours: parseFloat(emp.averageWorkingHours || 0).toFixed(2)
        }))
      });
    } catch (error) {
      console.error('Error fetching team summary:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/manager/attendance/today-status - Today's attendance status
  static async getTodayStatus(req, res) {
    try {
      const records = await managerRepository.getTodayStatus();
      
      res.status(200).json(
        records.map(record => ({
          id: record.id,
          employeeId: record.employeeId,
          name: record.name,
          email: record.email,
          department: record.department,
          currentStatus: record.currentStatus,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          totalHours: record.totalHours
        }))
      );
    } catch (error) {
      console.error('Error fetching today status:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/manager/attendance/export - Export CSV data
  static async exportAttendance(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const records = await managerRepository.getAttendanceForExport(startDate, endDate);
      
      // Create CSV format
      const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Date', 'Check-in', 'Check-out', 'Status', 'Total Hours'];
      const csvContent = [
        headers.join(','),
        ...records.map(record => 
          [
            record.employeeId,
            record.name,
            record.email,
            record.department,
            record.date || '',
            record.checkInTime || '',
            record.checkOutTime || '',
            record.status || '',
            record.totalHours || ''
          ].map(field => `"${field}"`).join(',')
        )
      ].join('\n');

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_export.csv"');
      
      res.status(200).send(csvContent);
    } catch (error) {
      console.error('Error exporting attendance:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = ManagerController;
