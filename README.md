# Employee Attendance System

A full-stack Employee Attendance Management System with React frontend and Node.js backend, using Supabase PostgreSQL database.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![React](https://img.shields.io/badge/React-19.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange)

## 🚀 Features

### Employee Features
- ✅ Check-in / Check-out with time tracking
- ✅ Late check-in detection (after 9:00 AM)
- ✅ Early checkout warning (before 6:00 PM)
- ✅ Attendance history with calendar view
- ✅ Monthly summary statistics
- ✅ Profile management

### Manager Features
- ✅ Team dashboard with charts
- ✅ View all employee attendance
- ✅ Monthly/Yearly reports with filters
- ✅ Calendar view with clickable dates
- ✅ Export attendance to CSV
- ✅ Late arrivals tracking

### System Features
- ✅ Session-based authentication (auto-logout on browser close)
- ✅ Role-based access control (Employee/Manager)
- ✅ Responsive design
- ✅ Weekend detection (no attendance required)

## 📁 Project Structure

```
Employee_Attendance_System/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── auth/           # Authentication service
│   │   ├── dashboard/      # Dashboard service
│   │   ├── employee/       # Employee & attendance service
│   │   ├── manager/        # Manager service
│   │   ├── database/       # Database schemas
│   │   └── server.js       # Combined production server
│   ├── package.json
│   └── .env.example
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand state management
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 22.x
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs

### Frontend
- **Framework:** React 19.x
- **Build Tool:** Vite 7.x
- **Language:** TypeScript 5.x
- **State Management:** Zustand (with sessionStorage)
- **HTTP Client:** Axios
- **Routing:** React Router DOM 7.x

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account with project created
- Git installed

## ⚙️ Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Thenmugilan-Dom/Employee_Attendance_System.git
cd Employee_Attendance_System
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `.env` file:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Database Type
DATABASE_TYPE=supabase

# Server Ports (for local microservices)
AUTH_PORT=3001
DASHBOARD_PORT=3002
EMPLOYEE_PORT=3003
MANAGER_PORT=3004

# Environment
NODE_ENV=development
```

Run backend:
```bash
# Production mode (combined server)
npm start

# Development mode (separate microservices)
npm run dev:auth
npm run dev:dashboard
npm run dev:employee
npm run dev:manager
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create `.env` file:
```env
# For local development with combined server
VITE_API_URL=http://localhost:3000

# OR for local development with microservices
VITE_AUTH_URL=http://localhost:3001/api
VITE_DASHBOARD_URL=http://localhost:3002/api
VITE_EMPLOYEE_URL=http://localhost:3003/api
VITE_MANAGER_URL=http://localhost:3004/api
```

Run frontend:
```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee',
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status VARCHAR(20) DEFAULT 'present',
  total_hours DECIMAL(4,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment on Render

### Deploy Backend (Web Service)

| Setting | Value |
|---------|-------|
| **Name** | `employee-attendance-backend` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

**Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `DATABASE_TYPE=supabase`
- `NODE_ENV=production`

### Deploy Frontend (Static Site)

| Setting | Value |
|---------|-------|
| **Name** | `employee-attendance-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

**Environment Variables:**
- `VITE_API_URL=https://your-backend-url.onrender.com`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/checkin` | Check in |
| POST | `/api/attendance/checkout` | Check out |
| GET | `/api/attendance/today` | Today's status |
| GET | `/api/attendance/my-history` | Attendance history |
| GET | `/api/attendance/my-summary` | Monthly summary |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/employee/:id` | Employee dashboard |
| GET | `/api/dashboard/manager` | Manager dashboard |

### Manager
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manager/attendance/all` | All employee attendance |
| GET | `/api/manager/attendance/summary` | Team summary |
| GET | `/api/manager/attendance/today-status` | Today's team status |
| GET | `/api/manager/attendance/export` | Export to CSV |

## 🕐 Business Rules

- **Check-in Time:** 9:00 AM
- **Check-out Time:** 6:00 PM
- **Late:** Check-in after 9:00 AM
- **Early Checkout:** Check-out before 6:00 PM
- **Weekends:** Saturday & Sunday (no attendance required)

## 👤 Default Users

After setting up, register users through the app or create them in Supabase:

```sql
-- Example: Create a manager
INSERT INTO users (employee_id, name, email, password, role, department)
VALUES ('MGR001', 'Admin Manager', 'admin@company.com', 'hashed_password', 'manager', 'IT');

-- Example: Create an employee
INSERT INTO users (employee_id, name, email, password, role, department)
VALUES ('EMP001', 'John Doe', 'john@company.com', 'hashed_password', 'employee', 'IT');
```

## 🔧 Troubleshooting

### Backend not connecting to Supabase
- Verify `SUPABASE_URL` and keys in `.env`
- Check Supabase dashboard for correct credentials

### Frontend API errors
- Ensure `VITE_API_URL` points to correct backend URL
- Check browser console for CORS errors
- Verify backend is running

### Render deployment fails
- Check build logs for errors
- Verify Root Directory is set correctly
- Ensure all environment variables are added

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 👨‍💻 Author

**Thenmugilan**
- GitHub: [@Thenmugilan-Dom](https://github.com/Thenmugilan-Dom)

---

Made with ❤️ using React, Node.js, and Supabase
