import { NavLink } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  userRole?: 'employee' | 'manager' | 'admin';
}

const Navbar = ({ userRole = 'employee' }: NavbarProps) => {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h2>Attendance System</h2>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/attendance" className={({ isActive }) => isActive ? 'active' : ''}>
            My Attendance
          </NavLink>
        </li>
        {(userRole === 'manager' || userRole === 'admin') && (
          <li>
            <NavLink to="/team" className={({ isActive }) => isActive ? 'active' : ''}>
              Team
            </NavLink>
          </li>
        )}
        {userRole === 'admin' && (
          <li>
            <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>
              Employees
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
