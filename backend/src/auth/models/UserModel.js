class UserModel {
  constructor(userData = {}) {
    this.id = userData.id || null;
    this.name = userData.name || '';
    this.email = userData.email || '';
    this.password = userData.password || '';
    this.role = userData.role || 'employee';
    this.employeeId = userData.employeeId || '';
    this.department = userData.department || '';
    this.createdAt = userData.createdAt || null;
    this.updatedAt = userData.updatedAt || null;
  }

  // Validation methods
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateEmployeeId(employeeId) {
    const employeeIdRegex = /^(EMP|MGR)\d{3}$/;
    return employeeIdRegex.test(employeeId);
  }

  static validateRole(role) {
    const validRoles = ['employee', 'manager'];
    return validRoles.includes(role);
  }

  static validatePassword(password) {
    // Password should be at least 8 characters
    return password && password.length >= 8;
  }

  static validateName(name) {
    return name && name.trim().length >= 2;
  }

  static validateDepartment(department) {
    return department && department.trim().length >= 2;
  }

  // Full validation for user object
  static validate(userData) {
    const errors = [];

    if (!this.validateName(userData.name)) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!this.validateEmail(userData.email)) {
      errors.push('Invalid email format');
    }

    if (userData.password && !this.validatePassword(userData.password)) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!this.validateRole(userData.role)) {
      errors.push('Role must be either employee or manager');
    }

    if (!this.validateEmployeeId(userData.employeeId)) {
      errors.push('Employee ID must follow format EMP001 or MGR001');
    }

    if (!this.validateDepartment(userData.department)) {
      errors.push('Department must be at least 2 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to safe object (without password)
  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      employeeId: this.employeeId,
      department: this.department,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Convert to JSON (without password)
  toJSON() {
    return this.toSafeObject();
  }

  // Static method to create from database row
  static fromDatabase(row) {
    return new UserModel(row);
  }

  // Static method to create multiple from database rows
  static fromDatabaseArray(rows) {
    return rows.map(row => new UserModel(row));
  }

  // Check if user is manager
  isManager() {
    return this.role === 'manager';
  }

  // Check if user is employee
  isEmployee() {
    return this.role === 'employee';
  }

  // Get employee ID prefix
  getEmployeeIdPrefix() {
    return this.employeeId.substring(0, 3);
  }

  // Get employee ID number
  getEmployeeIdNumber() {
    return parseInt(this.employeeId.substring(3));
  }
}

// Constants
UserModel.ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager'
};

UserModel.EMPLOYEE_ID_PREFIXES = {
  EMPLOYEE: 'EMP',
  MANAGER: 'MGR'
};

module.exports = UserModel;