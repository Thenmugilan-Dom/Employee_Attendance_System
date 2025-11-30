const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const router = express.Router();

// Check in
router.post('/checkin', attendanceController.checkin);
// Check out
router.post('/checkout', attendanceController.checkout);
// My attendance history
router.get('/my-history', attendanceController.myHistory);
// Monthly summary
router.get('/my-summary', attendanceController.mySummary);
// Today's status
router.get('/today', attendanceController.todayStatus);

module.exports = router;
