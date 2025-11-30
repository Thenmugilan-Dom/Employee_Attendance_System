import axios from 'axios';

// Microservices ports
const SERVICES = {
  auth: import.meta.env.VITE_AUTH_URL || 'http://localhost:3001/api',
  dashboard: import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3002/api',
  employee: import.meta.env.VITE_EMPLOYEE_URL || 'http://localhost:3003/api',
  manager: import.meta.env.VITE_MANAGER_URL || 'http://localhost:3004/api',
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
