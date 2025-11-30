const express = require('express');
const DashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Employee dashboard stats
router.get('/employee', DashboardController.getEmployeeDashboard);

// Manager dashboard stats
router.get('/manager', DashboardController.getManagerDashboard);

module.exports = router;
