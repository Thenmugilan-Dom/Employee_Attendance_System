// Supabase Database Connection for Employee Attendance System
// This replaces the MySQL connection when using Supabase

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - Set these in your .env file
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Create Supabase client with service role for backend operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create public client for auth operations
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseDatabase {
  // Execute a query (compatibility layer for existing code)
  static async execute(query, params = []) {
    // This is a compatibility layer - for Supabase, use the specific methods below
    console.warn('Direct SQL execute not supported in Supabase. Use Supabase client methods.');
    throw new Error('Use Supabase client methods instead of raw SQL');
  }

  // Health check
  static async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        response: { healthy: 1 }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // =============================================
  // USER OPERATIONS
  // =============================================

  // Find user by email
  static async findUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  // Find user by employee ID
  static async findUserByEmployeeId(employeeId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', employeeId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Find user by ID
  static async findUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Create new user
  static async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        employee_id: userData.employeeId,
        department: userData.department
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get all employees
  static async getAllEmployees() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee')
      .order('name');
    
    if (error) throw error;
    return data;
  }

  // =============================================
  // ATTENDANCE OPERATIONS
  // =============================================

  // Get today's attendance for user
  static async getTodayAttendance(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Check in
  static async checkIn(userId, employeeId) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];
    
    // Check if already checked in
    const existing = await this.getTodayAttendance(userId);
    
    if (existing) {
      if (existing.check_in_time) {
        throw new Error('Already checked in today');
      }
      // Update existing record
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_in_time: now, status: 'present' })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
    
    // Create new attendance record
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: userId,
        date: today,
        check_in_time: now,
        status: 'present'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Check out
  static async checkOut(userId) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];
    
    const existing = await this.getTodayAttendance(userId);
    
    if (!existing || !existing.check_in_time) {
      throw new Error('Not checked in today');
    }
    
    if (existing.check_out_time) {
      throw new Error('Already checked out today');
    }
    
    // Calculate total hours
    const checkIn = new Date(`${today}T${existing.check_in_time}`);
    const checkOut = new Date(`${today}T${now}`);
    const totalHours = (checkOut - checkIn) / (1000 * 60 * 60);
    
    const { data, error } = await supabase
      .from('attendance')
      .update({ 
        check_out_time: now, 
        total_hours: parseFloat(totalHours.toFixed(2))
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get user attendance history
  static async getAttendanceHistory(userId, limit = 30) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  // Get monthly summary
  static async getMonthlySummary(userId, month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) throw error;
    
    // Calculate summary
    const summary = {
      month,
      year,
      totalDays: data.length,
      presentDays: data.filter(a => a.status === 'present').length,
      absentDays: data.filter(a => a.status === 'absent').length,
      lateDays: data.filter(a => a.status === 'late').length,
      halfDays: data.filter(a => a.status === 'half-day').length,
      totalWorkingHours: data.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0),
      averageWorkingHours: 0
    };
    
    if (summary.presentDays > 0) {
      summary.averageWorkingHours = summary.totalWorkingHours / summary.presentDays;
    }
    
    return summary;
  }

  // Get all employees attendance (for manager)
  static async getAllEmployeesAttendance(limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email,
          employee_id,
          department
        )
      `)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data;
  }

  // Get today's attendance status for all employees
  static async getTodayAllEmployeesStatus() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        employee_id,
        department,
        attendance!left (
          id,
          date,
          check_in_time,
          check_out_time,
          status,
          total_hours
        )
      `)
      .eq('role', 'employee');
    
    if (error) throw error;
    
    // Filter and format
    return data.map(user => {
      const todayAttendance = user.attendance?.find(a => a.date === today);
      return {
        id: user.id,
        employeeId: user.employee_id,
        name: user.name,
        email: user.email,
        department: user.department,
        currentStatus: todayAttendance ? 
          (todayAttendance.check_out_time ? 'checked_out' : 'checked_in') : 
          'not_checked_in',
        checkInTime: todayAttendance?.check_in_time || null,
        checkOutTime: todayAttendance?.check_out_time || null,
        totalHours: todayAttendance?.total_hours || 0
      };
    });
  }

  // Get employee dashboard stats
  static async getEmployeeDashboardStats(employeeId) {
    // Find user
    const user = await this.findUserByEmployeeId(employeeId);
    if (!user) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Today's attendance
    const todayAttendance = await this.getTodayAttendance(user.id);
    
    // This month's stats
    const monthlyData = await this.getMonthlySummary(user.id, currentMonth, currentYear);
    
    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
    
    if (weeklyError) throw weeklyError;
    
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        department: user.department
      },
      today: {
        checkInTime: todayAttendance?.check_in_time || null,
        checkOutTime: todayAttendance?.check_out_time || null,
        status: todayAttendance?.status || 'absent',
        totalHours: todayAttendance?.total_hours || 0,
        isCheckedIn: todayAttendance?.check_in_time !== null && todayAttendance?.check_out_time === null,
        isCheckedOut: todayAttendance?.check_out_time !== null
      },
      thisMonth: {
        totalDays: monthlyData.totalDays,
        presentDays: monthlyData.presentDays,
        absentDays: monthlyData.absentDays,
        lateDays: monthlyData.lateDays,
        halfDays: monthlyData.halfDays,
        totalWorkingHours: monthlyData.totalWorkingHours,
        averageWorkingHours: monthlyData.averageWorkingHours.toFixed(2)
      },
      lastSevenDays: {
        totalDays: weeklyData.length,
        presentDays: weeklyData.filter(a => a.status === 'present').length,
        totalWorkingHours: weeklyData.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0)
      }
    };
  }

  // Get manager dashboard stats
  static async getManagerDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Get all employees
    const employees = await this.getAllEmployees();
    const totalEmployees = employees.length;
    
    // Today's attendance
    const todayStatus = await this.getTodayAllEmployeesStatus();
    const checkedIn = todayStatus.filter(e => e.currentStatus !== 'not_checked_in').length;
    const checkedOut = todayStatus.filter(e => e.currentStatus === 'checked_out').length;
    
    // This month's data
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (monthlyError) throw monthlyError;
    
    // Calculate monthly stats
    const presentRecords = monthlyData.filter(a => a.status === 'present').length;
    const absentRecords = monthlyData.filter(a => a.status === 'absent').length;
    const totalWorkingHours = monthlyData.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0);
    
    // Get departments
    const departments = {};
    employees.forEach(emp => {
      if (!departments[emp.department]) {
        departments[emp.department] = { employeeCount: 0, presentToday: 0 };
      }
      departments[emp.department].employeeCount++;
    });
    
    todayStatus.forEach(emp => {
      if (emp.currentStatus !== 'not_checked_in' && departments[emp.department]) {
        departments[emp.department].presentToday++;
      }
    });
    
    return {
      summary: {
        totalEmployees,
        todayCheckedIn: checkedIn,
        todayCheckedOut: checkedOut,
        todayAbsent: totalEmployees - checkedIn
      },
      thisMonth: {
        totalEmployees,
        employeesPresent: new Set(monthlyData.filter(a => a.status === 'present').map(a => a.user_id)).size,
        presentRecords,
        absentRecords,
        totalWorkingHours,
        averageWorkingHours: monthlyData.length > 0 ? (totalWorkingHours / monthlyData.length).toFixed(2) : '0.00'
      },
      departments: Object.entries(departments).map(([name, data]) => ({
        name,
        employeeCount: data.employeeCount,
        presentToday: data.presentToday
      }))
    };
  }
}

module.exports = SupabaseDatabase;
module.exports.supabase = supabase;
module.exports.supabasePublic = supabasePublic;
