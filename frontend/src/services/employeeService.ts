import api from './api';
import type { User } from '../types';

export const employeeService = {
  async getAllEmployees(): Promise<User[]> {
    const response = await api.get<{ data: User[] }>('/employees');
    return response.data.data;
  },

  async getEmployeeById(id: string): Promise<User> {
    const response = await api.get<{ data: User }>(`/employees/${id}`);
    return response.data.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<{ data: User }>('/employees/profile', data);
    return response.data.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put('/employees/change-password', { oldPassword, newPassword });
  },

  async getDepartments(): Promise<string[]> {
    const response = await api.get<{ data: string[] }>('/employees/departments');
    return response.data.data;
  },
};
