const db = require('../../repositories/database');

class AuthRepository {
  // Create new user
  static async create(userData) {
    try {
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
      
      // Return the created user (without password)
      if (result.insertId) {
        return await this.findById(result.insertId);
      }
      throw new Error('Failed to get insert ID');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = `
        SELECT id, name, email, password, role, employeeId, department, createdAt, updatedAt
        FROM users 
        WHERE id = ?
      `;
      
      const [rows] = await db.execute(query, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = `
        SELECT id, name, email, password, role, employeeId, department, createdAt, updatedAt
        FROM users 
        WHERE email = ?
      `;
      
      const [rows] = await db.execute(query, [email]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by employee ID
  static async findByEmployeeId(employeeId) {
    try {
      const query = `
        SELECT id, name, email, password, role, employeeId, department, createdAt, updatedAt
        FROM users 
        WHERE employeeId = ?
      `;
      
      const [rows] = await db.execute(query, [employeeId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by employee ID:', error);
      throw error;
    }
  }

  // Find last user by prefix (for generating next employee ID)
  static async findLastByPrefix(prefix) {
    try {
      const query = `
        SELECT employeeId
        FROM users 
        WHERE employeeId LIKE ?
        ORDER BY employeeId DESC
        LIMIT 1
      `;
      
      const [rows] = await db.execute(query, [`${prefix}%`]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding last user by prefix:', error);
      throw error;
    }
  }

  // Update user
  static async update(id, userData) {
    try {
      const fields = [];
      const values = [];

      // Dynamically build update query based on provided fields
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

      values.push(id); // Add ID for WHERE clause

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
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = ?';
      const [result] = await db.execute(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get all users (for admin purposes)
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT id, name, email, role, employeeId, department, createdAt, updatedAt
        FROM users
      `;
      
      const whereConditions = [];
      const values = [];

      // Add filters
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
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  // Check if email exists (for validation)
  static async emailExists(email, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
      const values = [email];

      if (excludeId) {
        query += ' AND id != ?';
        values.push(excludeId);
      }

      const [rows] = await db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('Error checking email exists:', error);
      throw error;
    }
  }

  // Check if employee ID exists (for validation)
  static async employeeIdExists(employeeId, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE employeeId = ?';
      const values = [employeeId];

      if (excludeId) {
        query += ' AND id != ?';
        values.push(excludeId);
      }

      const [rows] = await db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('Error checking employee ID exists:', error);
      throw error;
    }
  }
}

module.exports = AuthRepository;
