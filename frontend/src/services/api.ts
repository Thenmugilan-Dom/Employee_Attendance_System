import axios from 'axios';

// Base API URL - uses single combined server in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// For local development with separate microservices, use these:
const SERVICES = {
  auth: import.meta.env.VITE_AUTH_URL || `${API_BASE_URL}/api`,
  dashboard: import.meta.env.VITE_DASHBOARD_URL || `${API_BASE_URL}/api`,
  employee: import.meta.env.VITE_EMPLOYEE_URL || `${API_BASE_URL}/api`,
  manager: import.meta.env.VITE_MANAGER_URL || `${API_BASE_URL}/api`,
};

const createApiInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      // Use sessionStorage for token (auto-clears when browser/tab closes)
      const token = sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        sessionStorage.removeItem('token');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Create API instances for each service
export const authApi = createApiInstance(SERVICES.auth);
export const dashboardApi = createApiInstance(SERVICES.dashboard);
export const employeeApi = createApiInstance(SERVICES.employee);
export const managerApi = createApiInstance(SERVICES.manager);

// Default export for backwards compatibility (using auth service)
export default authApi;
