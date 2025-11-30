import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './Dashboard.css';

// This component redirects to the appropriate dashboard based on user role
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    // Redirect based on role
    if (user.role === 'manager') {
      navigate('/manager/dashboard');
    } else {
      navigate('/employee/dashboard');
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="dashboard-loading">
      <div className="loading">Redirecting...</div>
    </div>
  );
};

export default Dashboard;
