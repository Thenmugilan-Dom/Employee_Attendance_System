const dashboardRepository = require('../repositories/dashboardRepository');

class DashboardController {
  // GET /api/dashboard/employee - Employee dashboard stats
  static async getEmployeeDashboard(req, res) {
    try {
      const { employeeId } = req.query;

      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      const stats = await dashboardRepository.getEmployeeDashboardStats(employeeId);

      if (!stats) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching employee dashboard:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/dashboard/manager - Manager dashboard stats
  static async getManagerDashboard(req, res) {
    try {
      const stats = await dashboardRepository.getManagerDashboardStats();

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching manager dashboard:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = DashboardController;
