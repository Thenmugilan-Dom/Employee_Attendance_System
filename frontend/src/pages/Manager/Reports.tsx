import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerService } from '../../services/managerService';
import { useAuthStore } from '../../store';
import type { TeamSummary, EmployeeAttendanceRecord } from '../../types';
import './Reports.css';

interface DayAttendance {
  employeeId: string;
  name: string;
  department: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
}

const Reports = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [dateAttendance, setDateAttendance] = useState<DayAttendance[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [allAttendance, setAllAttendance] = useState<EmployeeAttendanceRecord[]>([]);

  // Current date info
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  useEffect(() => {
    loadSummary();
    loadAllAttendance();
  }, [selectedMonth, selectedYear]);

  // Reset selected date when month changes
  useEffect(() => {
    setSelectedDate(null);
    setDateAttendance([]);
  }, [selectedMonth, selectedYear]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await managerService.getTeamSummary(selectedMonth, selectedYear);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAttendance = async () => {
    try {
      const data = await managerService.getAllEmployeeAttendance(500, 0);
      setAllAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const handleDateClick = async (day: number, isWeekend: boolean, isFuture: boolean) => {
    if (isWeekend || isFuture || !day) return;
    
    setSelectedDate(day);
    setLoadingDate(true);
    
    try {
      // Format the selected date
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Filter attendance records for this date
      const dayRecords: DayAttendance[] = [];
      
      // Get all employees from summary
      const employees = summary?.employees || [];
      
      // Check each employee's attendance for this date
      for (const emp of employees) {
        // Find attendance record for this employee on this date
        const record = allAttendance.find(
          a => a.employeeId === emp.employeeId && a.attendance?.date === dateStr
        );
        
        if (record && record.attendance) {
          dayRecords.push({
            employeeId: emp.employeeId,
            name: emp.name,
            department: emp.department,
            status: record.attendance.status || 'present',
            checkInTime: record.attendance.checkInTime,
            checkOutTime: record.attendance.checkOutTime,
            totalHours: record.attendance.totalHours || 0
          });
        } else {
          // Employee was absent on this date
          dayRecords.push({
            employeeId: emp.employeeId,
            name: emp.name,
            department: emp.department,
            status: 'absent',
            checkInTime: null,
            checkOutTime: null,
            totalHours: 0
          });
        }
      }
      
      setDateAttendance(dayRecords);
    } catch (err) {
      console.error('Failed to load date attendance:', err);
    } finally {
      setLoadingDate(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExport = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      
      const blob = await managerService.exportAttendance(startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${selectedYear}_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
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

  // Calendar data
  const calendarData = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days: { day: number | null; isToday: boolean; isWeekend: boolean; isPast: boolean; isFuture: boolean }[] = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isToday: false, isWeekend: false, isPast: false, isFuture: false });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;
      const isPast = date < new Date(currentYear, currentMonth - 1, currentDay);
      const isFuture = date > new Date(currentYear, currentMonth - 1, currentDay);
      
      days.push({ day, isToday, isWeekend, isPast, isFuture });
    }
    
    return days;
  }, [selectedMonth, selectedYear, currentDay, currentMonth, currentYear]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter employees who have attendance in the selected month
  const filteredEmployees = useMemo(() => {
    if (!summary?.employees) return [];
    
    // Only show employees who have at least one attendance record (present, late, half day, or any hours)
    return summary.employees.filter(emp => 
      emp.presentDays > 0 || 
      emp.lateDays > 0 || 
      emp.halfDays > 0 || 
      emp.totalWorkingHours > 0
    );
  }, [summary?.employees]);

  // Calculate totals only from filtered employees
  const totals = useMemo(() => {
    if (filteredEmployees.length === 0) return null;
    
    return filteredEmployees.reduce(
      (acc, emp) => ({
        presentDays: acc.presentDays + emp.presentDays,
        absentDays: acc.absentDays + emp.absentDays,
        lateDays: acc.lateDays + emp.lateDays,
        totalHours: acc.totalHours + emp.totalWorkingHours,
      }),
      { presentDays: 0, absentDays: 0, lateDays: 0, totalHours: 0 }
    );
  }, [filteredEmployees]);

  // Go to today
  const goToToday = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setSelectedDate(currentDay);
    handleDateClick(currentDay, false, false);
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

  // Calculate date stats
  const dateStats = useMemo(() => {
    const present = dateAttendance.filter(a => a.status === 'present' || a.checkInTime).length;
    const absent = dateAttendance.filter(a => a.status === 'absent' && !a.checkInTime).length;
    const late = dateAttendance.filter(a => a.status === 'late').length;
    const totalHours = dateAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    
    return { present, absent, late, totalHours };
  }, [dateAttendance]);

  return (
    <div className="reports-page">
      <header className="page-header">
        <div className="header-left">
          <h1>Attendance Reports</h1>
        </div>
        <div className="header-right">
          <nav className="nav-links">
            <button onClick={() => navigate('/manager/dashboard')} className="nav-link">
              Dashboard
            </button>
            <button onClick={() => navigate('/manager/employees')} className="nav-link">
              All Employees
            </button>
          </nav>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="page-content">
        {/* Current Date Display */}
        <div className="current-date-banner">
          <div className="current-date-info">
            <span className="current-day-name">
              {today.toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            <span className="current-full-date">
              {today.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
          <div className="current-time">
            {today.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="report-controls">
          <div className="filters">
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
          
          <button onClick={handleExport} className="export-btn">
            📥 Export Report
          </button>
        </div>

        {/* Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-container">
            <div className="calendar-header">
              <button onClick={prevMonth} className="calendar-nav-btn">❮</button>
              <h3>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</h3>
              <button onClick={nextMonth} className="calendar-nav-btn">❯</button>
            </div>
            
            <div className="calendar-grid">
              {/* Week day headers */}
              {weekDays.map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
              
              {/* Calendar days */}
              {calendarData.map((dayData, index) => (
                <div 
                  key={index} 
                  className={`calendar-day 
                    ${dayData.day === null ? 'empty' : ''} 
                    ${dayData.isToday ? 'today' : ''} 
                    ${dayData.isWeekend ? 'weekend' : ''} 
                    ${dayData.isPast && !dayData.isWeekend && dayData.day ? 'workday' : ''} 
                    ${dayData.isFuture && !dayData.isWeekend ? 'future' : ''}
                    ${selectedDate === dayData.day ? 'selected' : ''}
                    ${!dayData.isWeekend && !dayData.isFuture && dayData.day ? 'clickable' : ''}
                  `}
                  onClick={() => dayData.day && handleDateClick(dayData.day, dayData.isWeekend, dayData.isFuture)}
                >
                  {dayData.day && (
                    <>
                      <span className="day-number">{dayData.day}</span>
                      {dayData.isToday && <span className="today-indicator">Today</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-dot today"></span> Today</span>
              <span className="legend-item"><span className="legend-dot selected-dot"></span> Selected</span>
              <span className="legend-item"><span className="legend-dot workday"></span> Workday</span>
              <span className="legend-item"><span className="legend-dot weekend"></span> Weekend</span>
            </div>
            
            <p className="calendar-hint">👆 Click on any workday to see attendance details</p>
          </div>

          {/* Date Attendance Details */}
          <div className="date-details-panel">
            {selectedDate ? (
              <>
                <div className="date-details-header">
                  <h3>📋 Attendance Details</h3>
                  <span className="selected-date-display">{getSelectedDateFormatted()}</span>
                </div>
                
                {loadingDate ? (
                  <div className="loading-date">Loading attendance data...</div>
                ) : (
                  <>
                    {/* Date Stats */}
                    <div className="date-stats-grid">
                      <div className="date-stat present">
                        <span className="date-stat-value">{dateStats.present}</span>
                        <span className="date-stat-label">Present</span>
                      </div>
                      <div className="date-stat absent">
                        <span className="date-stat-value">{dateStats.absent}</span>
                        <span className="date-stat-label">Absent</span>
                      </div>
                      <div className="date-stat late">
                        <span className="date-stat-value">{dateStats.late}</span>
                        <span className="date-stat-label">Late</span>
                      </div>
                      <div className="date-stat hours">
                        <span className="date-stat-value">{dateStats.totalHours.toFixed(1)}h</span>
                        <span className="date-stat-label">Total Hours</span>
                      </div>
                    </div>
                    
                    {/* Employee List for Date */}
                    <div className="date-employee-list">
                      <h4>Employee Attendance</h4>
                      {dateAttendance.length === 0 ? (
                        <p className="no-data-msg">No attendance records found</p>
                      ) : (
                        <div className="employee-attendance-items">
                          {dateAttendance.map((emp) => (
                            <div key={emp.employeeId} className={`emp-attendance-item ${emp.status}`}>
                              <div className="emp-att-info">
                                <span className="emp-att-name">{emp.name}</span>
                                <span className="emp-att-id">{emp.employeeId}</span>
                                <span className="emp-att-dept">{emp.department}</span>
                              </div>
                              <div className="emp-att-status">
                                {emp.checkInTime ? (
                                  <div className="emp-times">
                                    <span className="time-in">In: {formatTime(emp.checkInTime)}</span>
                                    {emp.checkOutTime && (
                                      <span className="time-out">Out: {formatTime(emp.checkOutTime)}</span>
                                    )}
                                    {emp.totalHours > 0 && (
                                      <span className="time-total">{emp.totalHours.toFixed(1)}h</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`status-badge ${emp.status}`}>
                                    {emp.status === 'absent' ? '❌ Absent' : emp.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="no-date-selected">
                <div className="no-date-icon">📅</div>
                <h4>Select a Date</h4>
                <p>Click on any workday in the calendar to view attendance details for that date.</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {totals && (
          <div className="totals-row">
            <div className="total-card">
              <span className="total-label">Total Present Days</span>
              <span className="total-value present">{totals.presentDays}</span>
            </div>
            <div className="total-card">
              <span className="total-label">Total Absent Days</span>
              <span className="total-value absent">{totals.absentDays}</span>
            </div>
            <div className="total-card">
              <span className="total-label">Total Late Days</span>
              <span className="total-value late">{totals.lateDays}</span>
            </div>
            <div className="total-card">
              <span className="total-label">Total Hours Worked</span>
              <span className="total-value hours">{Number(totals.totalHours).toFixed(1)}h</span>
            </div>
          </div>
        )}

        {/* Report Table */}
        <div className="table-container">
          <h2>Team Summary - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</h2>
          
          {loading ? (
            <div className="loading">Loading report...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="no-data">No attendance records found for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</div>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Half Day</th>
                  <th>Total Hours</th>
                  <th>Avg Hours/Day</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employeeId}>
                    <td className="emp-id">{emp.employeeId}</td>
                    <td className="emp-name">{emp.name}</td>
                    <td>{emp.department}</td>
                    <td className="present">{emp.presentDays}</td>
                    <td className="absent">{emp.absentDays}</td>
                    <td className="late">{emp.lateDays}</td>
                    <td>{emp.halfDays}</td>
                    <td>{Number(emp.totalWorkingHours).toFixed(1)}h</td>
                    <td>{emp.averageWorkingHours}h</td>
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

export default Reports;
