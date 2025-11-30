import { dashboardApi } from './api';
import type { EmployeeDashboardStats, ManagerDashboardStats } from '../types';

export const dashboardService = {
  // GET /api/dashboard/employee - Employee dashboard stats
  async getEmployeeDashboard(employeeId: string): Promise<EmployeeDashboardStats> {
    const response = await dashboardApi.get<EmployeeDashboardStats>('/dashboard/employee', {
      params: { employeeId }
    });
    return response.data;
  },

  // GET /api/dashboard/manager - Manager dashboard stats
  async getManagerDashboard(): Promise<ManagerDashboardStats> {
    const response = await dashboardApi.get<ManagerDashboardStats>('/dashboard/manager');
    return response.data;
  },
};
