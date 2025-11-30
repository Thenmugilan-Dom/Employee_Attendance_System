import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerService } from '../../services/managerService';
import { useAuthStore } from '../../store';
import type { EmployeeAttendanceRecord } from '../../types';
import './AllEmployees.css';

const AllEmployees = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [employees, setEmployees] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await managerService.getAllEmployeeAttendance();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusClass = (status: string | null) => {
    switch (status) {
      case 'present': return 'status-present';
      case 'absent': return 'status-absent';
      case 'late': return 'status-late';
      case 'half-day': return 'status-halfday';
      default: return '';
    }
  };

  // Get unique departments
  const departments = [...new Set(employees.map(e => e.department))].filter(Boolean);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

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
    }
  };

  return (
    <div className="all-employees">
      <header className="page-header">
        <div className="header-left">
          <h1>All Employees Attendance</h1>
        </div>
        <div className="header-right">
          <nav className="nav-links">
            <button onClick={() => navigate('/manager/dashboard')} className="nav-link">
              Dashboard
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

      <main className="page-content">
        {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <button onClick={handleExport} className="export-btn">
            📥 Export CSV
          </button>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <span>Showing {filteredEmployees.length} of {employees.length} records</span>
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="no-data">No employees found</div>
          ) : (
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((record, index) => (
                  <tr key={`${record.employeeId}-${index}`}>
                    <td className="emp-id">{record.employeeId}</td>
                    <td>
                      <div className="emp-cell">
                        <span className="emp-name">{record.name}</span>
                        <span className="emp-email">{record.email}</span>
                      </div>
                    </td>
                    <td>{record.department}</td>
                    <td>{formatDate(record.attendance?.date)}</td>
                    <td>{formatTime(record.attendance?.checkInTime)}</td>
                    <td>{formatTime(record.attendance?.checkOutTime)}</td>
                    <td>{record.attendance?.totalHours ? `${Number(record.attendance.totalHours).toFixed(2)}h` : '--'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(record.attendance?.status)}`}>
                        {record.attendance?.status || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="view-btn"
                        onClick={() => navigate(`/manager/employee/${record.employeeId}`)}
                      >
                        View
                      </button>
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

export default AllEmployees;
