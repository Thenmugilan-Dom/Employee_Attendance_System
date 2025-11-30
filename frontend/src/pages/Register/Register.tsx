import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee' as 'employee' | 'manager',
    employeeId: '',
    department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Auto-update employeeId prefix based on role
    if (name === 'role') {
      const prefix = value === 'manager' ? 'MGR' : 'EMP';
      const currentId = formData.employeeId;
      if (currentId.startsWith('EMP') || currentId.startsWith('MGR') || currentId === '') {
        const newRole = value as 'employee' | 'manager';
        setFormData(prev => ({
          ...prev,
          role: newRole,
          employeeId: prefix + (currentId.slice(3) || ''),
        }));
      }
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 4) return 'Password must be at least 4 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.employeeId.trim()) return 'Employee ID is required';
    if (!/^(EMP|MGR)\d{3}$/.test(formData.employeeId)) {
      return 'Employee ID must be in format EMP001 or MGR001';
    }
    if (!formData.department.trim()) return 'Department is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        employeeId: formData.employeeId,
        department: formData.department,
      });
      
      // Registration successful, redirect to login
      navigate('/login', { 
        state: { message: 'Registration successful! Please login.' }
      });
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const error = err as { response?: { data?: { error?: string }; status?: number }; message?: string };
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.status === 409) {
        setError('User already exists with this email or employee ID.');
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Employee Attendance System</h1>
          <p>Create your account</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                type="text"
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder={formData.role === 'manager' ? 'MGR001' : 'EMP001'}
                required
              />
              <small className="input-hint">
                Format: {formData.role === 'manager' ? 'MGR001' : 'EMP001'}
              </small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g., Engineering, HR, Sales"
              required
            />
          </div>
          
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <p className="login-link">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
