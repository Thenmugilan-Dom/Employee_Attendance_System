// User types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'employee' | 'manager';
  employee_id: string;
  department: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'employee' | 'manager';
  employeeId: string;
  department: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Attendance types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'not_checked_in' | 'checked_in' | 'checked_out';

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  workingHours: number;
}

export interface TodayStatus {
  id?: number;
  employeeId: string;
  date?: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  workingHours?: number;
}

export interface AttendanceSummary {
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
}

// Dashboard types - Employee
export interface EmployeeDashboardStats {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    employeeId: string;
    department: string;
  };
  today: {
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
    totalHours: number;
    isCheckedIn: boolean;
    isCheckedOut: boolean;
  };
  thisMonth: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    totalWorkingHours: number;
    averageWorkingHours: string;
  };
  lastSevenDays: {
    totalDays: number;
    presentDays: number;
    totalWorkingHours: number;
  };
}

// Dashboard types - Manager
export interface ManagerDashboardStats {
  summary: {
    totalEmployees: number;
    todayCheckedIn: number;
    todayCheckedOut: number;
    todayAbsent: number;
  };
  thisMonth: {
    totalEmployees: number;
    employeesPresent: number;
    presentRecords: number;
    absentRecords: number;
    totalWorkingHours: number;
    averageWorkingHours: string;
  };
  departments: {
    name: string;
    employeeCount: number;
    presentToday: number;
  }[];
}

// Manager Attendance Types
export interface EmployeeAttendanceRecord {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  attendance: {
    id: number;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: AttendanceStatus;
    totalHours: number;
  };
}

export interface EmployeeWithAttendance {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  attendance: {
    id: number;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: AttendanceStatus;
    totalHours: number;
  }[];
}

export interface TeamSummary {
  month: number;
  year: number;
  employees: {
    id: number;
    employeeId: string;
    name: string;
    department: string;
    totalRecords: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    totalWorkingHours: number;
    averageWorkingHours: string;
  }[];
}

export interface TodayAttendanceStatus {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  currentStatus: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
}

// Filter types
export interface AttendanceFilter {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  department?: string;
}
