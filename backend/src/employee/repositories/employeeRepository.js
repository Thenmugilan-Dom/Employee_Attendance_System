require('dotenv').config();

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'supabase';

let db;
let supabase;

if (DATABASE_TYPE === 'supabase') {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} else {
  db = require('../../repositories/database');
}

class EmployeeRepository {
  // Check if employee exists in users table
  static async employeeExists(employeeId) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('employee_id', employeeId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data ? data.id : null;
      } else {
        const query = 'SELECT id FROM users WHERE employeeId = ? LIMIT 1';
        const [rows] = await db.execute(query, [employeeId]);
        return rows.length > 0 ? rows[0].id : null;
      }
    } catch (error) {
      console.error('Error checking employee:', error);
      throw error;
    }
  }

  // Check-in for employee
  static async checkin(employeeId) {
    try {
      const userId = await this.employeeExists(employeeId);
      if (!userId) return null;

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0];

      if (DATABASE_TYPE === 'supabase') {
        // Check if already checked in today
        const { data: existing } = await supabase
          .from('attendance')
          .select('id, check_in_time')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        if (existing && existing.check_in_time) {
          return { error: 'Already checked in today' };
        }

        if (existing) {
          // Update existing record
          const { data, error } = await supabase
            .from('attendance')
            .update({ check_in_time: now, status: 'present' })
            .eq('id', existing.id)
            .select()
            .single();
          
          if (error) throw error;
          return this.formatAttendanceRecord(data);
        }

        // Create new record
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
        return this.formatAttendanceRecord(data);
      } else {
        // MySQL logic
        const [existing] = await db.execute(
          'SELECT id FROM attendance WHERE userId = ? AND date = ?',
          [userId, today]
        );
        
        if (existing.length > 0) {
          return { error: 'Already checked in today' };
        }

        const query = `
          INSERT INTO attendance (userId, checkInTime, date, status)
          VALUES (?, ?, ?, 'present')
        `;
        
        const [result] = await db.execute(query, [userId, now, today]);
        
        if (result.insertId) {
          return await this.getAttendanceById(result.insertId);
        }
        return null;
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      throw error;
    }
  }

  // Check-out for employee
  static async checkout(employeeId) {
    try {
      const userId = await this.employeeExists(employeeId);
      if (!userId) return null;

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0];

      if (DATABASE_TYPE === 'supabase') {
        // Find today's record
        const { data: existing, error: findError } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        if (findError && findError.code !== 'PGRST116') throw findError;
        
        if (!existing || !existing.check_in_time) {
          return { error: 'Not checked in today' };
        }
        
        if (existing.check_out_time) {
          return { error: 'Already checked out today' };
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
        return this.formatAttendanceRecord(data);
      } else {
        // MySQL logic
        const query = `
          UPDATE attendance 
          SET checkOutTime = ?, 
              totalHours = TIMESTAMPDIFF(MINUTE, checkInTime, ?) / 60.0
          WHERE userId = ? AND date = ? AND checkOutTime IS NULL
        `;
        
        const [result] = await db.execute(query, [now, now, userId, today]);
        
        if (result.affectedRows > 0) {
          const [record] = await db.execute(
            'SELECT * FROM attendance WHERE userId = ? AND date = ?',
            [userId, today]
          );
          return record[0] || null;
        }
        return { error: 'Not checked in or already checked out' };
      }
    } catch (error) {
      console.error('Error during check-out:', error);
      throw error;
    }
  }

  // Get attendance history for employee
  static async getAttendanceHistory(employeeId, limit = 30) {
    try {
      const userId = await this.employeeExists(employeeId);
      if (!userId) return [];

      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data.map(this.formatAttendanceRecord);
      } else {
        const query = `
          SELECT id, userId, date, checkInTime, checkOutTime, totalHours, status
          FROM attendance 
          WHERE userId = ?
          ORDER BY date DESC
          LIMIT ?
        `;
        
        const [records] = await db.execute(query, [userId, limit]);
        return records;
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error;
    }
  }

  // Get monthly attendance summary
  static async getAttendanceSummary(employeeId, month, year) {
    try {
      const userId = await this.employeeExists(employeeId);
      if (!userId) return {};

      if (DATABASE_TYPE === 'supabase') {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate);

        if (error) throw error;

        const presentDays = data.filter(a => a.status === 'present').length;
        const totalHours = data.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0);

        return {
          month,
          year,
          totalDays: data.length,
          presentDays,
          absentDays: data.filter(a => a.status === 'absent').length,
          totalWorkingHours: totalHours,
          averageWorkingHours: presentDays > 0 ? totalHours / presentDays : 0
        };
      } else {
        const query = `
          SELECT 
            COUNT(*) as totalDays,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
            SUM(totalHours) as totalWorkingHours,
            AVG(totalHours) as averageWorkingHours
          FROM attendance 
          WHERE userId = ? AND MONTH(date) = ? AND YEAR(date) = ?
        `;
        
        const [result] = await db.execute(query, [userId, month, year]);
        return {
          month,
          year,
          ...result[0]
        };
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  }

  // Get today's attendance status
  static async getTodayAttendance(employeeId) {
    try {
      const userId = await this.employeeExists(employeeId);
      if (!userId) return null;

      const today = new Date().toISOString().split('T')[0];

      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.formatAttendanceRecord(data) : null;
      } else {
        const query = `
          SELECT id, userId, date, checkInTime, checkOutTime, totalHours, status
          FROM attendance 
          WHERE userId = ? AND date = ?
          LIMIT 1
        `;
        
        const [records] = await db.execute(query, [userId, today]);
        return records[0] || null;
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      throw error;
    }
  }

  // Get attendance by ID
  static async getAttendanceById(id) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return this.formatAttendanceRecord(data);
      } else {
        const query = `
          SELECT id, userId, date, checkInTime, checkOutTime, totalHours, status
          FROM attendance 
          WHERE id = ?
          LIMIT 1
        `;
        
        const [records] = await db.execute(query, [id]);
        return records[0] || null;
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  }

  // Helper to format Supabase attendance record to app format
  static formatAttendanceRecord(record) {
    if (!record) return null;
    return {
      id: record.id,
      date: record.date,
      checkInTime: record.check_in_time,
      checkOutTime: record.check_out_time,
      status: record.status,
      workingHours: record.total_hours || 0,
      totalHours: record.total_hours || 0
    };
  }
}

module.exports = EmployeeRepository;
