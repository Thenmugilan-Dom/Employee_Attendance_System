import { managerApi } from './api';
import type { 
  EmployeeAttendanceRecord, 
  EmployeeWithAttendance, 
  TeamSummary, 
  TodayAttendanceStatus 
} from '../types';

export const managerService = {
  // GET /api/manager/attendance/all - All employees attendance
  async getAllEmployeeAttendance(limit = 100, offset = 0): Promise<EmployeeAttendanceRecord[]> {
    const response = await managerApi.get<EmployeeAttendanceRecord[]>('/manager/attendance/all', {
      params: { limit, offset }
    });
    return response.data;
  },

  // GET /api/manager/attendance/employee/:id - Specific employee attendance
  async getEmployeeAttendance(employeeId: string, limit = 30, offset = 0): Promise<EmployeeWithAttendance> {
    const response = await managerApi.get<EmployeeWithAttendance>(`/manager/attendance/employee/${employeeId}`, {
      params: { limit, offset }
    });
    return response.data;
  },

  // GET /api/manager/attendance/summary - Team summary
  async getTeamSummary(month?: number, year?: number): Promise<TeamSummary> {
    const response = await managerApi.get<TeamSummary>('/manager/attendance/summary', {
      params: { month, year }
    });
    return response.data;
  },

  // GET /api/manager/attendance/today-status - Today's attendance status
  async getTodayStatus(): Promise<TodayAttendanceStatus[]> {
    const response = await managerApi.get<TodayAttendanceStatus[]>('/manager/attendance/today-status');
    return response.data;
  },

  // GET /api/manager/attendance/export - Export CSV
  async exportAttendance(startDate?: string, endDate?: string): Promise<Blob> {
    const response = await managerApi.get('/manager/attendance/export', {
      params: { startDate, endDate },
      responseType: 'blob'
    });
    return response.data;
  },
};
