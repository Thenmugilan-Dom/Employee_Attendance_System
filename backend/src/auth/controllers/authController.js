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
      // All fields are required, no auto-generation
      if (!name || !email || !password || !role || !employeeId || !department) {
        return res.status(400).json({ error: 'All fields are required.' });
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

      // Return 204 No Content for successful registration
      res.status(204).end();

    } catch (error) {
      console.error('Registration error:', error.message);
      console.error('Full error:', error);
      res.status(500).json({
        error: 'Internal server error during registration',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /api/auth/login
  static async login(req, res) {
    try {
      // Only use provided credentials
      let { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
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
      console.log('Auth header:', authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No valid auth header found');
        return res.status(401).json({ message: 'Invalid token' });
      }
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('Token extracted:', token.substring(0, 20) + '...');

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
        console.log('Token verified successfully, decoded:', decoded);
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError.message);
        return res.status(401).json({
          message: 'Invalid token'
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
        message: "Profile retrieved successfully",
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
      console.error('Get user error:', error.message);
      res.status(500).json({
        error: 'Internal server error while fetching user data'
      });
    }
  }


}

module.exports = AuthController;
