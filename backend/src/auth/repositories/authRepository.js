require('dotenv').config();

// Choose database based on environment variable
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'supabase';

let db;
let supabase;

if (DATABASE_TYPE === 'supabase') {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase credentials not found in environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
  } else {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Using Supabase database');
  }
} else {
  db = require('../../repositories/database');
  console.log('✅ Using MySQL database');
}

class AuthRepository {
  // Create new user
  static async create(userData) {
    try {
      if (DATABASE_TYPE === 'supabase') {
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
        
        // Map to consistent format
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          employeeId: data.employee_id,
          department: data.department,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } else {
        // MySQL
        const query = `
          INSERT INTO users (name, email, password, role, employeeId, department)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          userData.name,
          userData.email,
          userData.password,
          userData.role,
          userData.employeeId,
          userData.department
        ];

        const [result] = await db.execute(query, values);
        
        if (result.insertId) {
          return await this.findById(result.insertId);
        }
        throw new Error('Failed to get insert ID');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          employeeId: data.employee_id,
          department: data.department,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } else {
        const query = `
          SELECT id, name, email, password, role, employeeId, department, createdAt, updatedAt
          FROM users 
          WHERE id = ?
        `;
        
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
      }
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          employeeId: data.employee_id,
          department: data.department,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } else {
        const query = `
          SELECT id, name, email, password, role, employeeId, department, createdAt, updatedAt
          FROM users 
          WHERE email = ?
        `;
        
        const [rows] = await db.execute(query, [email]);
        return rows.length > 0 ? rows[0] : null;
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by employee ID
  static async findByEmployeeId(employeeId) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('employee_id', employeeId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          employeeId: data.employee_id,
          department: data.department,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } else {
        const query = `
          SELECT id, name, email, password, role, employeeId, department, createdAt, updatedAt
          FROM users 
          WHERE employeeId = ?
        `;
        
        const [rows] = await db.execute(query, [employeeId]);
        return rows.length > 0 ? rows[0] : null;
      }
    } catch (error) {
      console.error('Error finding user by employee ID:', error);
      throw error;
    }
  }

  // Update user
  static async update(id, userData) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const updateData = {};
        if (userData.name !== undefined) updateData.name = userData.name;
        if (userData.email !== undefined) updateData.email = userData.email;
        if (userData.password !== undefined) updateData.password = userData.password;
        if (userData.role !== undefined) updateData.role = userData.role;
        if (userData.department !== undefined) updateData.department = userData.department;
        
        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          employeeId: data.employee_id,
          department: data.department,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } else {
        const fields = [];
        const values = [];

        if (userData.name !== undefined) {
          fields.push('name = ?');
          values.push(userData.name);
        }
        if (userData.email !== undefined) {
          fields.push('email = ?');
          values.push(userData.email);
        }
        if (userData.password !== undefined) {
          fields.push('password = ?');
          values.push(userData.password);
        }
        if (userData.role !== undefined) {
          fields.push('role = ?');
          values.push(userData.role);
        }
        if (userData.department !== undefined) {
          fields.push('department = ?');
          values.push(userData.department);
        }

        if (fields.length === 0) {
          throw new Error('No fields to update');
        }

        values.push(id);

        const query = `
          UPDATE users 
          SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const [result] = await db.execute(query, values);
        
        if (result.affectedRows === 0) {
          throw new Error('User not found');
        }

        return await this.findById(id);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } else {
        const query = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get all users
  static async findAll(filters = {}) {
    try {
      if (DATABASE_TYPE === 'supabase') {
        let query = supabase
          .from('users')
          .select('id, name, email, role, employee_id, department, created_at, updated_at');
        
        if (filters.role) query = query.eq('role', filters.role);
        if (filters.department) query = query.eq('department', filters.department);
        
        query = query.order('name');
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employee_id,
          department: user.department,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }));
      } else {
        let query = `
          SELECT id, name, email, role, employeeId, department, createdAt, updatedAt
          FROM users
        `;
        
        const whereConditions = [];
        const values = [];

        if (filters.role) {
          whereConditions.push('role = ?');
          values.push(filters.role);
        }
        if (filters.department) {
          whereConditions.push('department = ?');
          values.push(filters.department);
        }

        if (whereConditions.length > 0) {
          query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY name';

        const [rows] = await db.execute(query, values);
        return rows;
      }
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }
}

module.exports = AuthRepository;
