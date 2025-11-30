const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');
const UserModel = require('../models/UserModel');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
  // POST /api/auth/register
  static async register(req, res) {
    try {
      // Extract data from request body
      let { name, email, password, role, employeeId, department } = req.body || {};
      
      // If no data provided, generate sample data
      if (!name && !email && !password && !role && !employeeId && !department) {
        const randomNum = Math.floor(Math.random() * 10000) + 100;
        name = `TestUser${randomNum}`;
        email = `testuser${randomNum}@company.com`;
        password = "1234";
        role = "employee";
        employeeId = `EMP${String(randomNum).padStart(3, '0')}`;
        department = "Engineering";
        console.log(`🔧 Auto-generating sample user: ${name}, ${email}, ${employeeId}`);
      } else {
        // Use provided data or set defaults
        name = name || "Default User";
        email = email || `user${Date.now()}@company.com`;
        password = password || "1234";
        role = role || "employee";
        if (!employeeId) {
          // Generate next available employee ID
          try {
            const prefix = role === 'manager' ? 'MGR' : 'EMP';
            const lastUser = await authRepository.findLastByPrefix(prefix);
            
            if (!lastUser) {
              employeeId = `${prefix}001`;
            } else {
              const lastNumber = parseInt(lastUser.employeeId.substring(3));
              const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
              employeeId = `${prefix}${nextNumber}`;
            }
          } catch (genError) {
            console.error('Error generating employee ID:', genError);
            employeeId = role === 'manager' ? 'MGR001' : 'EMP001';
          }
        }
        department = department || "Engineering";
        console.log(`📝 Using provided user data: ${name}, ${email}, ${employeeId}`);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }

      // Validate employee ID format (EMP001 or MGR001)
      const employeeIdRegex = /^(EMP|MGR)\d{3}$/;
      if (!employeeIdRegex.test(employeeId)) {
        return res.status(400).json({
          error: 'Invalid employee ID format. Use EMP001 for employees or MGR001 for managers'
        });
      }

      // Validate role
      const validRoles = ['employee', 'manager'];
      const userRole = role || 'employee';
      if (!validRoles.includes(userRole)) {
        return res.status(400).json({
          error: 'Invalid role. Must be either employee or manager'
        });
      }

      // Check if user already exists
      const existingUserByEmail = await authRepository.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(409).json({
          error: 'User already exists with this email'
        });
      }

      const existingUserByEmployeeId = await authRepository.findByEmployeeId(employeeId);
      if (existingUserByEmployeeId) {
        return res.status(409).json({
          error: 'User already exists with this employee ID'
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userData = {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        employeeId,
        department
      };

      const newUser = await authRepository.create(userData);

      // Return 201 Created with user data (like in the image)
      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employee_id: newUser.employeeId,
          department: newUser.department,
          created_at: newUser.createdAt
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error during registration'
      });
    }
  }

  // POST /api/auth/login
  static async login(req, res) {
    try {
      // If no body provided or empty body, use default sample data
      let { email, password } = req.body || {};
      
      // Auto-fill with sample data if empty request or missing fields
      if (!email || !password) {
        email = "thenmugilan@company.com";
        password = "1234";
        console.log('🔧 Using auto-filled sample data for login');
      }

      // Find user by email
      const user = await authRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      // For development: log token to console so you can use it for testing
      console.log('🔑 JWT Token for testing:', token);

      // Return 200 OK with user data and token
      res.status(200).json({
        message: "Login successful",
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employee_id: user.employeeId,
          department: user.department,
          created_at: user.createdAt
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error during login'
      });
    }
  }

  // GET /api/auth/me
  static async me(req, res) {
    try {
      // Extract token from Authorization header
      let authHeader = req.headers.authorization;
      
      // If no token provided, generate a sample token automatically
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        
        const sampleTokenPayload = {
          id: 1,
          email: "thenmugilan@company.com",
          role: "employee",
          employeeId: "EMP001",
          department: "Engineering"
        };
        
        const autoToken = jwt.sign(sampleTokenPayload, JWT_SECRET, { expiresIn: '24h' });
        authHeader = `Bearer ${autoToken}`;
        console.log('🔑 Auto-generated token for testing:', autoToken);
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }

      // Get user from database
      const user = await authRepository.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Return user data (excluding password) with 200 OK for GET request
      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching user data'
      });
    }
  }


}

module.exports = AuthController;
