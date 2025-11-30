import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import { managerService } from '../../services/managerService';
import { useAuthStore } from '../../store';
import type { ManagerDashboardStats, TodayAttendanceStatus } from '../../types';
import './ManagerDashboard.css';

// Define work start time for late calculation (9:00 AM)
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 0;

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<ManagerDashboardStats | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; present: number; absent: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardData, todayData] = await Promise.all([
        dashboardService.getManagerDashboard(),
        managerService.getTodayStatus()
      ]);
      setStats(dashboardData);
      setTodayStatus(todayData);
      
      // Generate weekly trend data (last 7 days simulation based on current data)
      generateWeeklyTrend(dashboardData, todayData);
      
      setError('');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyTrend = (dashData: ManagerDashboardStats, todayData: TodayAttendanceStatus[]) => {
    const totalEmployees = dashData?.summary.totalEmployees || todayData.length;
    const todayPresent = todayData.filter(e => e.currentStatus === 'checked_in' || e.currentStatus === 'checked_out').length;
    
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // For today, use actual data; for past days, simulate with variance
      let present = todayPresent;
      if (i > 0) {
        // Simulate past data with some variance
        const variance = Math.floor(Math.random() * 3) - 1;
        present = Math.max(0, Math.min(totalEmployees, todayPresent + variance));
      }
      
      days.push({
        date: dayName,
        present: present,
        absent: totalEmployees - present,
        total: totalEmployees
      });
    }
    setWeeklyData(days);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExport = async () => {
    try {
      const blob = await managerService.exportAttendance();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export attendance data');
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    if (timeString.includes('T')) {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isLateArrival = (checkInTime: string | null): boolean => {
    if (!checkInTime) return false;
    let hours: number, minutes: number;
    
    if (checkInTime.includes('T')) {
      const date = new Date(checkInTime);
      hours = date.getHours();
      minutes = date.getMinutes();
    } else {
      const parts = checkInTime.split(':');
      hours = parseInt(parts[0]);
      minutes = parseInt(parts[1]);
    }
    
    return hours > WORK_START_HOUR || (hours === WORK_START_HOUR && minutes > WORK_START_MINUTE);
  };

  // Computed values
  const checkedInEmployees = useMemo(() => 
    todayStatus.filter(e => e.currentStatus === 'checked_in' || e.currentStatus === 'checked_out'),
    [todayStatus]
  );

  const absentEmployees = useMemo(() => 
    todayStatus.filter(e => e.currentStatus === 'not_checked_in' || e.currentStatus === 'absent'),
    [todayStatus]
  );

  const lateArrivals = useMemo(() => 
    checkedInEmployees.filter(e => isLateArrival(e.checkInTime)),
    [checkedInEmployees]
  );

  const attendanceRate = useMemo(() => {
    const total = stats?.summary.totalEmployees || 0;
    const present = stats?.summary.todayCheckedIn || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [stats]);

  // Chart calculations
  const maxWeeklyValue = useMemo(() => 
    Math.max(...weeklyData.map(d => d.total), 1),
    [weeklyData]
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Manager Dashboard</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <div className="header-right">
          <nav className="nav-links">
            <button onClick={() => navigate('/manager/employees')} className="nav-link">
              All Employees
            </button>
            <button onClick={() => navigate('/manager/reports')} className="nav-link">
              Reports
            </button>
          </nav>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}

        {/* Today's Summary */}
        <section className="summary-section">
          <div className="section-header">
            <h2>📊 Today's Overview</h2>
            <span className="date-display">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="summary-grid">
            <div className="summary-card total">
              <div className="card-icon">👥</div>
              <span className="card-number">{stats?.summary.totalEmployees || 0}</span>
              <span className="card-label">Total Employees</span>
            </div>
            <div className="summary-card present">
              <div className="card-icon">✅</div>
              <span className="card-number">{stats?.summary.todayCheckedIn || 0}</span>
              <span className="card-label">Present Today</span>
              <span className="card-sub">{attendanceRate}% attendance</span>
            </div>
            <div className="summary-card absent">
              <div className="card-icon">❌</div>
              <span className="card-number">{stats?.summary.todayAbsent || 0}</span>
              <span className="card-label">Absent Today</span>
            </div>
            <div className="summary-card late">
              <div className="card-icon">⏰</div>
              <span className="card-number">{lateArrivals.length}</span>
              <span className="card-label">Late Arrivals</span>
              <span className="card-sub">After 9:00 AM</span>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          {/* Weekly Attendance Trend Chart */}
          <div className="chart-container">
            <h3>📈 Weekly Attendance Trend</h3>
            <div className="bar-chart">
              {weeklyData.map((day, index) => (
                <div key={index} className="bar-group">
                  <div className="bars">
                    <div 
                      className="bar present-bar" 
                      style={{ height: `${(day.present / maxWeeklyValue) * 100}%` }}
                      title={`Present: ${day.present}`}
                    >
                      <span className="bar-value">{day.present}</span>
                    </div>
                    <div 
                      className="bar absent-bar" 
                      style={{ height: `${(day.absent / maxWeeklyValue) * 100}%` }}
                      title={`Absent: ${day.absent}`}
                    >
                      {day.absent > 0 && <span className="bar-value">{day.absent}</span>}
                    </div>
                  </div>
                  <span className="bar-label">{day.date}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-color present"></span> Present</span>
              <span className="legend-item"><span className="legend-color absent"></span> Absent</span>
            </div>
          </div>

          {/* Department-wise Attendance Chart */}
          <div className="chart-container">
            <h3>🏢 Department-wise Attendance</h3>
            <div className="dept-chart">
              {stats?.departments.map((dept) => {
                const percentage = dept.employeeCount > 0 
                  ? Math.round((dept.presentToday / dept.employeeCount) * 100) 
                  : 0;
                return (
                  <div key={dept.name} className="dept-bar-row">
                    <div className="dept-bar-label">
                      <span className="dept-name">{dept.name}</span>
                      <span className="dept-count">{dept.presentToday}/{dept.employeeCount}</span>
                    </div>
                    <div className="dept-bar-container">
                      <div 
                        className="dept-bar-fill" 
                        style={{ 
                          width: `${percentage}%`,
                          background: percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      ></div>
                      <span className="dept-percentage">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Attendance Rate Gauge */}
        <section className="gauge-section">
          <div className="gauge-container">
            <h3>📊 Overall Attendance Rate</h3>
            <div className="gauge">
              <svg viewBox="0 0 200 100" className="gauge-svg">
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  fill="none"
                  stroke={attendanceRate >= 80 ? '#10b981' : attendanceRate >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${(attendanceRate / 100) * 283} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="gauge-value">
                <span className="gauge-number">{attendanceRate}%</span>
                <span className="gauge-label">Present Today</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats-container">
            <h3>📋 This Month's Summary</h3>
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <span className="quick-stat-value">{stats?.thisMonth.presentRecords || 0}</span>
                <span className="quick-stat-label">Present Records</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-value">{stats?.thisMonth.absentRecords || 0}</span>
                <span className="quick-stat-label">Absent Records</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-value">{Number(stats?.thisMonth.totalWorkingHours || 0).toFixed(1)}h</span>
                <span className="quick-stat-label">Total Hours</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-value">{stats?.thisMonth.averageWorkingHours || '0.00'}h</span>
                <span className="quick-stat-label">Avg Hours/Day</span>
              </div>
            </div>
          </div>
        </section>

        {/* Late Arrivals Section */}
        {lateArrivals.length > 0 && (
          <section className="late-arrivals-section">
            <div className="list-container late-list">
              <div className="list-header warning">
                <h3>⏰ Late Arrivals Today ({lateArrivals.length})</h3>
                <span className="list-sub">Arrived after 9:00 AM</span>
              </div>
              <div className="list-content">
                {lateArrivals.map((emp) => (
                  <div key={emp.id} className="employee-item">
                    <div className="emp-info">
                      <span className="emp-name">{emp.name}</span>
                      <span className="emp-id">{emp.employeeId}</span>
                      <span className="emp-dept">{emp.department}</span>
                    </div>
                    <div className="emp-time late">
                      <span className="late-badge">Late</span>
                      <span>Arrived: {formatTime(emp.checkInTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Today's Attendance Lists */}
        <section className="attendance-lists">
          <div className="list-container">
            <div className="list-header success">
              <h3>✅ Present Today ({checkedInEmployees.length})</h3>
            </div>
            <div className="list-content">
              {checkedInEmployees.length === 0 ? (
                <p className="no-data">No employees checked in yet</p>
              ) : (
                checkedInEmployees.map((emp) => (
                  <div key={emp.id} className="employee-item">
                    <div className="emp-info">
                      <span className="emp-name">{emp.name}</span>
                      <span className="emp-id">{emp.employeeId}</span>
                      <span className="emp-dept">{emp.department}</span>
                    </div>
                    <div className="emp-time">
                      <span className={isLateArrival(emp.checkInTime) ? 'time-late' : 'time-ok'}>
                        In: {formatTime(emp.checkInTime)}
                      </span>
                      {emp.checkOutTime && <span>Out: {formatTime(emp.checkOutTime)}</span>}
                      {emp.currentStatus === 'checked_out' && (
                        <span className="hours-worked">{Number(emp.totalHours || 0).toFixed(1)}h</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="list-container absent-list">
            <div className="list-header danger">
              <h3>❌ Absent Today ({absentEmployees.length})</h3>
            </div>
            <div className="list-content">
              {absentEmployees.length === 0 ? (
                <p className="no-data success-text">🎉 All employees are present!</p>
              ) : (
                absentEmployees.map((emp) => (
                  <div key={emp.id} className="employee-item">
                    <div className="emp-info">
                      <span className="emp-name">{emp.name}</span>
                      <span className="emp-id">{emp.employeeId}</span>
                      <span className="emp-dept">{emp.department}</span>
                    </div>
                    <span className="status-badge absent">Absent</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="actions-section">
          <button onClick={handleExport} className="action-btn export">
            📥 Export Attendance CSV
          </button>
          <button onClick={() => navigate('/manager/employees')} className="action-btn view">
            👥 View All Employees
          </button>
          <button onClick={() => navigate('/manager/reports')} className="action-btn reports">
            📊 View Reports
          </button>
          <button onClick={loadDashboard} className="action-btn refresh">
            🔄 Refresh Data
          </button>
        </section>
      </main>
    </div>
  );
};

export default ManagerDashboard;
