const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register', AuthController.register);

// POST /api/auth/login - User login
router.post('/login', AuthController.login);

// GET /api/auth/me - Get current user profile
router.get('/me', AuthController.me);

// GET /api/auth/sample - Get sample data for testing
router.get('/sample', (req, res) => {
  res.status(200).json({
    message: "Sample data for Postman testing",
    register: {
      name: "Thenmugilan",
      email: "thenmugilan@company.com",
      password: "1234",
      role: "employee",
      employeeId: "EMP001",
      department: "Engineering"
    },
    login: {
      email: "thenmugilan@company.com",
      password: "1234"
    },
    instructions: [
      "1. POST /api/auth/register with register data → 204 No Content",
      "2. POST /api/auth/login with login data → 204 No Content", 
      "3. Check server console for JWT token",
      "4. GET /api/auth/me with Authorization: Bearer TOKEN → 200 OK"
    ]
  });
});

module.exports = router;
