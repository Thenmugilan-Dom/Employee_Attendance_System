import { authApi } from './api';
import type { LoginCredentials, AuthResponse, User, RegisterData } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authApi.post<AuthResponse>('/auth/login', credentials);
    if (response.data.token) {
      // Use sessionStorage - auto clears when browser/tab is closed
      sessionStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async register(userData: RegisterData): Promise<void> {
    // Backend returns 204 No Content on successful registration
    await authApi.post('/auth/register', userData);
  },

  async logout(): Promise<void> {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token'); // Clear legacy localStorage too
  },

  async getCurrentUser(): Promise<User> {
    const response = await authApi.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem('token');
  },
};
