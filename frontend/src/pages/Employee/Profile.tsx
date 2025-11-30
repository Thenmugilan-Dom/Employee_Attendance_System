import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="profile-page">
      <header className="page-header">
        <div className="header-left">
          <h1>My Profile</h1>
        </div>
        <div className="header-right">
          <nav className="nav-links">
            <button onClick={() => navigate('/employee/dashboard')} className="nav-link">
              Dashboard
            </button>
            <button onClick={() => navigate('/employee/attendance')} className="nav-link">
              My Attendance
            </button>
          </nav>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="page-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <span className="avatar-initial">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>

          <div className="profile-info">
            <h2>{user?.name || 'User'}</h2>
            <p className="role-badge">{user?.role}</p>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <span className="detail-label">Employee ID</span>
              <span className="detail-value">{user?.employee_id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user?.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Department</span>
              <span className="detail-value">{user?.department}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Role</span>
              <span className="detail-value capitalize">{user?.role}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Member Since</span>
              <span className="detail-value">{formatDate(user?.created_at)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
