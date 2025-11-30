const attendanceRepository = require('../repositories/employeeRepository');

const attendanceController = {
  // POST /api/attendance/checkin
  async checkin(req, res) {
    try {
      const { employeeId } = req.body;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      // Check if employee exists
      const employeeExists = await attendanceRepository.employeeExists(employeeId);
      if (!employeeExists) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const checkIn = await attendanceRepository.checkin(employeeId);
      
      if (!checkIn) {
        return res.status(400).json({ error: 'Check-in failed or already checked in today' });
      }

      res.status(201).json({
        id: checkIn.id,
        employeeId: checkIn.employeeId,
        checkInTime: checkIn.checkInTime,
        date: checkIn.date
      });
    } catch (error) {
      console.error('Check-in error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // POST /api/attendance/checkout
  async checkout(req, res) {
    try {
      const { employeeId } = req.body;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      // Check if employee exists
      const employeeExists = await attendanceRepository.employeeExists(employeeId);
      if (!employeeExists) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const checkOut = await attendanceRepository.checkout(employeeId);
      
      if (!checkOut) {
        return res.status(400).json({ error: 'Check-out failed or no check-in found today' });
      }

      res.status(200).json({
        id: checkOut.id,
        employeeId: checkOut.employeeId,
        checkInTime: checkOut.checkInTime,
        checkOutTime: checkOut.checkOutTime,
        workingHours: checkOut.workingHours,
        date: checkOut.date
      });
    } catch (error) {
      console.error('Check-out error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // GET /api/attendance/my-history
  async myHistory(req, res) {
    try {
      const { employeeId } = req.query;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      // Check if employee exists
      const employeeExists = await attendanceRepository.employeeExists(employeeId);
      if (!employeeExists) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const history = await attendanceRepository.getAttendanceHistory(employeeId);
      
      res.status(200).json(
        history.map(record => ({
          id: record.id,
          employeeId: record.employeeId,
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          workingHours: record.workingHours,
          status: record.status
        }))
      );
    } catch (error) {
      console.error('Get history error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // GET /api/attendance/my-summary
  async mySummary(req, res) {
    try {
      const { employeeId, month, year } = req.query;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      // Check if employee exists
      const employeeExists = await attendanceRepository.employeeExists(employeeId);
      if (!employeeExists) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const currentDate = new Date();
      const monthParam = month || currentDate.getMonth() + 1;
      const yearParam = year || currentDate.getFullYear();

      const summary = await attendanceRepository.getAttendanceSummary(employeeId, monthParam, yearParam);
      
      res.status(200).json({
        month: monthParam,
        year: yearParam,
        totalDays: summary.totalDays || 0,
        presentDays: summary.presentDays || 0,
        absentDays: summary.absentDays || 0,
        totalWorkingHours: summary.totalWorkingHours || 0,
        averageWorkingHours: summary.averageWorkingHours || 0
      });
    } catch (error) {
      console.error('Get summary error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // GET /api/attendance/today
  async todayStatus(req, res) {
    try {
      const { employeeId } = req.query;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      // Check if employee exists in users table
      const employeeExists = await attendanceRepository.employeeExists(employeeId);
      if (!employeeExists) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const todayRecord = await attendanceRepository.getTodayAttendance(employeeId);
      
      if (!todayRecord) {
        return res.status(200).json({
          employeeId: employeeId,
          status: 'not_checked_in',
          checkInTime: null,
          checkOutTime: null
        });
      }

      res.status(200).json({
        id: todayRecord.id,
        employeeId: todayRecord.employeeId,
        date: todayRecord.date,
        checkInTime: todayRecord.checkInTime,
        checkOutTime: todayRecord.checkOutTime,
        status: todayRecord.checkOutTime ? 'checked_out' : 'checked_in',
        workingHours: todayRecord.workingHours
      });
    } catch (error) {
      console.error('Get today status error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = attendanceController;
