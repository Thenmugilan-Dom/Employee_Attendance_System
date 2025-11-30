const express = require('express');
const ManagerController = require('../controllers/managerController');

const router = express.Router();

// All employees attendance
router.get('/attendance/all', ManagerController.getAllEmployeeAttendance);

// Specific employee attendance
router.get('/attendance/employee/:id', ManagerController.getEmployeeAttendance);

// Team summary
router.get('/attendance/summary', ManagerController.getTeamSummary);

// Today's status
router.get('/attendance/today-status', ManagerController.getTodayStatus);

// Export CSV
router.get('/attendance/export', ManagerController.exportAttendance);

module.exports = router;
