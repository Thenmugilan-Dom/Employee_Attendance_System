import { employeeApi } from './api';
import type { AttendanceRecord, AttendanceSummary, TodayStatus } from '../types';

export const attendanceService = {
  // POST /api/attendance/checkin - Check in (requires employeeId in body)
  async checkIn(employeeId: string): Promise<AttendanceRecord> {
    const response = await employeeApi.post<AttendanceRecord>('/attendance/checkin', { employeeId });
    return response.data;
  },

  // POST /api/attendance/checkout - Check out (requires employeeId in body)
  async checkOut(employeeId: string): Promise<AttendanceRecord> {
    const response = await employeeApi.post<AttendanceRecord>('/attendance/checkout', { employeeId });
    return response.data;
  },

  // GET /api/attendance/my-history - Get my attendance history
  async getMyHistory(employeeId: string): Promise<AttendanceRecord[]> {
    const response = await employeeApi.get<AttendanceRecord[]>('/attendance/my-history', {
      params: { employeeId }
    });
    return response.data;
  },

  // GET /api/attendance/my-summary - Get monthly summary
  async getMySummary(employeeId: string, month?: number, year?: number): Promise<AttendanceSummary> {
    const response = await employeeApi.get<AttendanceSummary>('/attendance/my-summary', {
      params: { employeeId, month, year }
    });
    return response.data;
  },

  // GET /api/attendance/today - Get today's status
  async getTodayStatus(employeeId: string): Promise<TodayStatus> {
    const response = await employeeApi.get<TodayStatus>('/attendance/today', {
      params: { employeeId }
    });
    return response.data;
  },
};
