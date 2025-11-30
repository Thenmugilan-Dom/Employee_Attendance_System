import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

// Auth Pages
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';

// Employee Pages
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import AttendanceHistory from './pages/Employee/AttendanceHistory';
import Profile from './pages/Employee/Profile';

// Manager Pages
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import AllEmployees from './pages/Manager/AllEmployees';
import Reports from './pages/Manager/Reports';

// Components
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

import './App.css';

// Redirect based on user role
const RoleBasedRedirect = () => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'manager') {
    return <Navigate to="/manager/dashboard" replace />;
  }
  
  return <Navigate to="/employee/dashboard" replace />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Employee Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/attendance" element={<AttendanceHistory />} />
          <Route path="/employee/profile" element={<Profile />} />
        </Route>
        
        {/* Manager Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/employees" element={<AllEmployees />} />
          <Route path="/manager/reports" element={<Reports />} />
        </Route>
        
        {/* Role-based redirect for root */}
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="/dashboard" element={<RoleBasedRedirect />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
