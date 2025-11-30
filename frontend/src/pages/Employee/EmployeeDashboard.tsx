import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import { attendanceService } from '../../services/attendanceService';
import { useAuthStore } from '../../store';
import type { EmployeeDashboardStats } from '../../types';
import './EmployeeDashboard.css';

// Helper function to safely format numbers
const formatNumber = (value: unknown, decimals = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num) || value === null || value === undefined) return '0';
  return num.toFixed(decimals);
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<EmployeeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user?.employee_id) return;
    
    try {
      setLoading(true);
      const data = await dashboardService.getEmployeeDashboard(user.employee_id);
      setStats(data);
      setError('');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.employee_id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Check if current time is after 9:00 AM (late check-in)
  const isLateCheckIn = () => {
    const now = new Date();
    const nineAM = new Date();
    nineAM.setHours(9, 0, 0, 0);
    return now > nineAM;
  };

  // Check if current time is after 6:00 PM (checkout time)
  const isAfterWorkHours = () => {
    const now = new Date();
    const sixPM = new Date();
    sixPM.setHours(18, 0, 0, 0);
    return now >= sixPM;
  };

  // Check if it's a weekend
  const isWeekend = () => {
    const day = currentTime.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const handleCheckIn = async () => {
    if (!user?.employee_id) return;
    
    setActionLoading(true);
    try {
      await attendanceService.checkIn(user.employee_id);
      await loadDashboard();
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.employee_id) return;
    
    setActionLoading(true);
    try {
      await attendanceService.checkOut(user.employee_id);
      await loadDashboard();
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    // Handle both TIME format (HH:MM:SS) and full datetime
    if (timeString.includes('T')) {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    // TIME format from MySQL
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if user was late (check-in after 9 AM)
  const wasLateToday = () => {
    if (!stats?.today.checkInTime) return false;
    const checkInTime = stats.today.checkInTime;
    let hours: number;
    
    if (checkInTime.includes('T')) {
      hours = new Date(checkInTime).getHours();
    } else {
      hours = parseInt(checkInTime.split(':')[0]);
    }
    
    return hours >= 9;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Determine the current state
  const hasCheckedIn = stats?.today.isCheckedIn;
  const hasCheckedOut = stats?.today.isCheckedOut;
  const isWeekendDay = isWeekend();

  return (
    <div className="employee-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Employee Dashboard</h1>
          <p>Welcome back, {user?.name || 'Employee'}</p>
        </div>
        <div className="header-right">
          <nav className="nav-links">
            <button onClick={() => navigate('/employee/attendance')} className="nav-link">
              My Attendance
            </button>
            <button onClick={() => navigate('/employee/profile')} className="nav-link">
              Profile
            </button>
          </nav>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}

        {/* Current Time Display */}
        <div className="current-time-banner">
          <div className="time-info">
            <span className="current-day">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            <span className="current-date">
              {currentTime.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
          <div className="live-clock">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>

        {/* Weekend Message - No attendance on weekends */}
        {isWeekendDay && (
          <div className="weekend-banner">
            <div className="weekend-icon">🏖️</div>
            <div className="weekend-text">
              <h3>It's the Weekend!</h3>
              <p>Enjoy your time off. Attendance is not required on weekends.</p>
            </div>
          </div>
        )}

        {/* Work Schedule Info - Only on weekdays */}
        {!isWeekendDay && (
          <div className="work-schedule-info">
            <div className="schedule-item">
              <span className="schedule-icon">🕘</span>
              <span className="schedule-text">Check-in Time: <strong>9:00 AM</strong></span>
            </div>
            <div className="schedule-item">
              <span className="schedule-icon">🕕</span>
              <span className="schedule-text">Check-out Time: <strong>6:00 PM</strong></span>
            </div>
          </div>
        )}

        {/* Check-in/Check-out Action Section - Only on weekdays */}
        {!isWeekendDay && (
          <section className="action-section">
            <div className="action-card check-in-card">
              <div className="action-header">
                <h2>👋 Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}!</h2>
                <p>Mark your attendance for today</p>
              </div>
              
              {isLateCheckIn() && (
                <div className="late-warning">
                  <span className="warning-icon">⚠️</span>
                  <span>You are checking in late (after 9:00 AM)</span>
                </div>
              )}
              
              <div className="action-buttons">
                <button
                  onClick={handleCheckIn}
                  className={`big-action-btn check-in ${isLateCheckIn() ? 'late' : ''}`}
                  disabled={actionLoading || hasCheckedIn}
                >
                  {actionLoading ? (
                    <span className="btn-loading">Processing...</span>
                  ) : (
                    <>
                      <span className="btn-icon">🟢</span>
                      <span className="btn-text">
                        {isLateCheckIn() ? 'Check In (Late)' : 'Check In'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCheckOut}
                  className={`big-action-btn check-out ${isAfterWorkHours() ? 'on-time' : 'early'}`}
                  disabled={actionLoading || !hasCheckedIn || hasCheckedOut}
                >
                  {actionLoading ? (
                    <span className="btn-loading">Processing...</span>
                  ) : (
                    <>
                      <span className="btn-icon">🔴</span>
                      <span className="btn-text">
                        {isAfterWorkHours() ? 'Check Out' : 'Check Out (Early)'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {!isAfterWorkHours() && hasCheckedIn && !hasCheckedOut && (
                <div className="early-checkout-notice">
                  <span className="notice-icon">ℹ️</span>
                  <span>Regular checkout time is 6:00 PM</span>
                </div>
              )}

              {hasCheckedIn && hasCheckedOut && (
                <div className="attendance-complete-banner">
                  ✅ Attendance completed for today - Check In: {formatTime(stats?.today.checkInTime || null)} | Check Out: {formatTime(stats?.today.checkOutTime || null)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Today's Attendance - Show after check-in */}
        {hasCheckedIn && (
          <section className="today-section">
            <div className="section-header">
              <h2>📋 Today's Attendance</h2>
              {wasLateToday() && <span className="status-badge late">Late</span>}
              {hasCheckedOut && <span className="status-badge completed">Completed</span>}
            </div>

            <div className="today-card">
              <div className="attendance-times">
                <div className="time-box">
                  <span className="time-label">Check In</span>
                  <span className={`time-value ${wasLateToday() ? 'late' : 'on-time'}`}>
                    {formatTime(stats?.today.checkInTime || null)}
                  </span>
                  {wasLateToday() && <span className="time-status late">Late</span>}
                </div>
                <div className="time-divider"></div>
                <div className="time-box">
                  <span className="time-label">Check Out</span>
                  <span className={`time-value ${hasCheckedOut ? 'checked' : 'pending'}`}>
                    {hasCheckedOut ? formatTime(stats?.today.checkOutTime || null) : 'Pending'}
                  </span>
                </div>
                <div className="time-divider"></div>
                <div className="time-box">
                  <span className="time-label">Total Hours</span>
                  <span className="time-value hours">
                    {stats?.today.totalHours ? `${formatNumber(stats.today.totalHours)}h` : '--'}
                  </span>
                </div>
              </div>

              {hasCheckedOut && (
                <div className="attendance-complete-banner">
                  ✅ Attendance completed for today
                </div>
              )}
            </div>
          </section>
        )}

        {/* Monthly Summary - Always show */}
        <section className="summary-section">
          <h2>📊 This Month's Summary</h2>
          <div className="summary-grid">
            <div className="summary-card present">
              <span className="summary-number">{stats?.thisMonth.presentDays || 0}</span>
              <span className="summary-label">Present Days</span>
            </div>
            <div className="summary-card absent">
              <span className="summary-number">{stats?.thisMonth.absentDays || 0}</span>
              <span className="summary-label">Absent Days</span>
            </div>
            <div className="summary-card late">
              <span className="summary-number">{stats?.thisMonth.lateDays || 0}</span>
              <span className="summary-label">Late Days</span>
            </div>
            <div className="summary-card hours">
              <span className="summary-number">{formatNumber(stats?.thisMonth.totalWorkingHours || 0, 1)}</span>
              <span className="summary-label">Total Hours</span>
            </div>
          </div>
        </section>

        {/* Last 7 Days - Always show */}
        <section className="weekly-section">
          <h2>📅 Last 7 Days</h2>
          <div className="weekly-stats">
            <div className="weekly-stat">
              <span className="stat-value">{stats?.lastSevenDays.presentDays || 0}</span>
              <span className="stat-label">Days Present</span>
            </div>
            <div className="weekly-stat">
              <span className="stat-value">{formatNumber(stats?.lastSevenDays.totalWorkingHours || 0, 1)}h</span>
              <span className="stat-label">Hours Worked</span>
            </div>
            <div className="weekly-stat">
              <span className="stat-value">
                {stats?.lastSevenDays.presentDays 
                  ? formatNumber(Number(stats.lastSevenDays.totalWorkingHours) / Number(stats.lastSevenDays.presentDays), 1)
                  : '0'}h
              </span>
              <span className="stat-label">Avg Hours/Day</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default EmployeeDashboard;
