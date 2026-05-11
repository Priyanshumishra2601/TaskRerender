# TaskRerender

Task Management System

A full-stack Task Management System built using the MERN stack concepts with React, Node.js, Express, and MySQL. This project helps teams manage projects, assign tasks, track progress, and collaborate efficiently.

Features
User Authentication (Register/Login)
JWT Based Authorization
Admin & Member Roles
Create and Manage Projects
Create, Update, and Delete Tasks
Assign Tasks to Team Members
Task Status Tracking
Dashboard Statistics
Activity Tracking
Responsive UI
Tech Stack
Frontend
React.js
Vite
Tailwind CSS
Axios
React Router DOM
Backend
Node.js
Express.js
JWT Authentication
bcryptjs
Database
MySQL (Railway Cloud Database)
Deployment
Frontend: Vercel
Backend: Render
Database: Railway


Live Demo
Frontend
https://task-rerender.vercel.app
Backend API
https://taskrerender.onrender.com
Folder Structure
task_management_system/
│
├── client/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── db.js
│   │   └── index.js
│   └── package.json
│
└── README.md
Environment Variables
Backend (.env)
MYSQLHOST=
MYSQLPORT=
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=

JWT_SECRET=

CORS_ORIGIN=
Frontend (.env)
VITE_API_URL=
Installation & Setup
Clone Repository
git clone <https://github.com/Priyanshumishra2601/TaskRerender.git>
cd task_management_system
Backend Setup
cd server
npm install
npm start
Frontend Setup
cd client
npm install
npm run dev
Database Setup

Create the following tables in MySQL:

users
projects
tasks
project_members
API Routes
Auth Routes
/api/auth/register
/api/auth/login
/api/auth/me
Project Routes
/api/projects
Task Routes
/api/tasks
Author

Priyanshu Mishra

Future Improvements
File Upload Support
Notifications
Real-time Chat
Dark Mode
Email Verification
Task Comments