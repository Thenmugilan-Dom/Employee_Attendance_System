import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { useAuthStore } from '../../store';
import type { AttendanceRecord, AttendanceSummary } from '../../types';
import './AttendanceHistory.css';

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  // Current date info
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const loadData = useCallback(async () => {
    if (!user?.employee_id) return;
    
    try {
      setLoading(true);
      const [historyData, summaryData] = await Promise.all([
        attendanceService.getMyHistory(user.employee_id),
        attendanceService.getMySummary(user.employee_id, selectedMonth, selectedYear)
      ]);
      setHistory(historyData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.employee_id, selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset selected date when month changes
  useEffect(() => {
    setSelectedDate(null);
  }, [selectedMonth, selectedYear]);

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'present': return 'status-present';
      case 'absent': return 'status-absent';
      case 'late': return 'status-late';
      case 'half-day': return 'status-halfday';
      default: return '';
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter history to only show records for selected month/year
  const filteredHistory = useMemo(() => {
    return history.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() + 1 === selectedMonth && 
             recordDate.getFullYear() === selectedYear;
    });
  }, [history, selectedMonth, selectedYear]);

  // Calendar data with attendance status
  const calendarData = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: { 
      day: number | null; 
      isToday: boolean; 
      isWeekend: boolean; 
      isPast: boolean;
      isFuture: boolean;
      attendance: AttendanceRecord | null;
    }[] = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isToday: false, isWeekend: false, isPast: false, isFuture: false, attendance: null });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;
      const isPast = date < new Date(currentYear, currentMonth - 1, currentDay);
      const isFuture = date > new Date(currentYear, currentMonth - 1, currentDay);
      
      // Find attendance record for this day
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendance = filteredHistory.find(h => h.date === dateStr) || null;
      
      days.push({ day, isToday, isWeekend, isPast, isFuture, attendance });
    }
    
    return days;
  }, [selectedMonth, selectedYear, currentDay, currentMonth, currentYear, filteredHistory]);

  // Get attendance for selected date
  const selectedDateAttendance = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    return filteredHistory.find(h => h.date === dateStr) || null;
  }, [selectedDate, selectedMonth, selectedYear, filteredHistory]);

  // Get selected date formatted
  const getSelectedDateFormatted = () => {
    if (!selectedDate) return '';
    const date = new Date(selectedYear, selectedMonth - 1, selectedDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if date was late
  const wasLate = (checkInTime: string | null) => {
    if (!checkInTime) return false;
    let hours: number;
    if (checkInTime.includes('T')) {
      hours = new Date(checkInTime).getHours();
    } else {
      hours = parseInt(checkInTime.split(':')[0]);
    }
    return hours >= 9;
  };

  const handleDateClick = (day: number, _isWeekend: boolean, isFuture: boolean) => {
    if (isFuture) return;
    setSelectedDate(day);
  };

  // Navigate months
  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setSelectedDate(currentDay);
  };

  // Get attendance status color for calendar
  const getCalendarDayClass = (dayData: typeof calendarData[0]) => {
    if (!dayData.day) return 'empty';
    let classes = [];
    
    if (dayData.isToday) classes.push('today');
    if (dayData.isWeekend) classes.push('weekend');
    if (dayData.isFuture) classes.push('future');
    if (selectedDate === dayData.day) classes.push('selected');
    if (!dayData.isWeekend && !dayData.isFuture) classes.push('clickable');
    
    // Add attendance status
    if (dayData.attendance) {
      if (dayData.attendance.status === 'present') classes.push('has-present');
      else if (dayData.attendance.status === 'late') classes.push('has-late');
      else if (dayData.attendance.status === 'absent') classes.push('has-absent');
      else if (dayData.attendance.status === 'half-day') classes.push('has-halfday');
    } else if (dayData.isPast && !dayData.isWeekend) {
      classes.push('has-absent');
    }
    
    return classes.join(' ');
  };

  return (
    <div className="attendance-history">
      <header className="page-header">
        <div className="header-left">
          <h1>My Attendance History</h1>
          <p>{user?.name}</p>
        </div>
        <div className="header-right">
          <nav className="nav-links">
            <button onClick={() => navigate('/employee/dashboard')} className="nav-link">
              Dashboard
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

      <main className="page-content">
        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Month:</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={goToToday} className="today-btn">
            📅 Today
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <span className="card-value present">{summary.presentDays}</span>
              <span className="card-label">Present</span>
            </div>
            <div className="summary-card">
              <span className="card-value absent">{summary.absentDays}</span>
              <span className="card-label">Absent</span>
            </div>
            <div className="summary-card">
              <span className="card-value hours">{Number(summary.totalWorkingHours).toFixed(2)}h</span>
              <span className="card-label">Total Hours</span>
            </div>
            <div className="summary-card">
              <span className="card-value avg">{Number(summary.averageWorkingHours).toFixed(2)}h</span>
              <span className="card-label">Avg Hours/Day</span>
            </div>
          </div>
        )}

        {/* Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-container">
            <div className="calendar-header">
              <button onClick={prevMonth} className="calendar-nav-btn">❮</button>
              <h3>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</h3>
              <button onClick={nextMonth} className="calendar-nav-btn">❯</button>
            </div>
            
            <div className="calendar-grid">
              {weekDays.map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
              
              {calendarData.map((dayData, index) => (
                <div 
                  key={index} 
                  className={`calendar-day ${getCalendarDayClass(dayData)}`}
                  onClick={() => dayData.day && handleDateClick(dayData.day, dayData.isWeekend, dayData.isFuture)}
                >
                  {dayData.day && (
                    <>
                      <span className="day-number">{dayData.day}</span>
                      {dayData.isToday && <span className="today-indicator">Today</span>}
                      {dayData.attendance && (
                        <span className={`day-status-dot ${dayData.attendance.status}`}></span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-dot today"></span> Today</span>
              <span className="legend-item"><span className="legend-dot present"></span> Present</span>
              <span className="legend-item"><span className="legend-dot late"></span> Late</span>
              <span className="legend-item"><span className="legend-dot absent"></span> Absent</span>
              <span className="legend-item"><span className="legend-dot weekend"></span> Weekend</span>
            </div>
            
            <p className="calendar-hint">👆 Click on any date to see attendance details</p>
          </div>

          {/* Date Details Panel */}
          <div className="date-details-panel">
            {selectedDate ? (
              <>
                <div className="date-details-header">
                  <h3>📋 Attendance Details</h3>
                  <span className="selected-date-display">{getSelectedDateFormatted()}</span>
                </div>
                
                {selectedDateAttendance ? (
                  <div className="date-attendance-info">
                    <div className="attendance-status-banner">
                      <span className={`status-icon ${selectedDateAttendance.status}`}>
                        {selectedDateAttendance.status === 'present' ? '✅' : 
                         selectedDateAttendance.status === 'late' ? '⚠️' : 
                         selectedDateAttendance.status === 'absent' ? '❌' : '⏰'}
                      </span>
                      <span className={`status-text ${selectedDateAttendance.status}`}>
                        {selectedDateAttendance.status === 'present' ? 'Present' :
                         selectedDateAttendance.status === 'late' ? 'Late Arrival' :
                         selectedDateAttendance.status === 'absent' ? 'Absent' : 'Half Day'}
                      </span>
                    </div>
                    
                    <div className="attendance-details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Check In</span>
                        <span className={`detail-value ${wasLate(selectedDateAttendance.checkInTime) ? 'late' : 'on-time'}`}>
                          {formatTime(selectedDateAttendance.checkInTime)}
                        </span>
                        {wasLate(selectedDateAttendance.checkInTime) && (
                          <span className="late-tag">Late</span>
                        )}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Check Out</span>
                        <span className="detail-value">
                          {formatTime(selectedDateAttendance.checkOutTime)}
                        </span>
                      </div>
                      <div className="detail-item full-width">
                        <span className="detail-label">Working Hours</span>
                        <span className="detail-value hours">
                          {selectedDateAttendance.workingHours 
                            ? `${Number(selectedDateAttendance.workingHours).toFixed(2)} hours` 
                            : 'Not calculated'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-attendance-info">
                    {new Date(selectedYear, selectedMonth - 1, selectedDate).getDay() === 0 ||
                     new Date(selectedYear, selectedMonth - 1, selectedDate).getDay() === 6 ? (
                      <>
                        <div className="no-data-icon">🏖️</div>
                        <h4>Weekend</h4>
                        <p>No attendance required on weekends.</p>
                      </>
                    ) : (
                      <>
                        <div className="no-data-icon">❌</div>
                        <h4>No Attendance</h4>
                        <p>No attendance record found for this date.</p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="no-date-selected">
                <div className="no-date-icon">📅</div>
                <h4>Select a Date</h4>
                <p>Click on any date in the calendar to view your attendance details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Table */}
        <div className="table-container">
          <h3 className="table-title">📊 Attendance Records - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</h3>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="no-data">No attendance records found for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</div>
          ) : (
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{formatTime(record.checkInTime)}</td>
                    <td>{formatTime(record.checkOutTime)}</td>
                    <td>{record.workingHours ? `${Number(record.workingHours).toFixed(2)}h` : '--'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default AttendanceHistory;
