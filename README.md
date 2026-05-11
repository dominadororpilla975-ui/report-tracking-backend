# Report Tracking System

A comprehensive web-based report tracking system for managing citizen's reports across multiple government departments.

## System Overview

This is a production-ready report tracking system that enables:

- **Citizens** to submit reports about city issues
- **Department Staff** to process and manage reports
- **Administrators** to coordinate and oversee the entire tracking process

## Features

### 📋 Core Features

- **Report Management**: Create, assign, track, and update reports
- **Department Management**: Organize reports by responsible departments
- **User Management**: Role-based access control (Admin, Staff, Department, Client)
- **Report Workflow**: Status tracking from Pending → Assigned → Processing → Completed
- **History Tracking**: Complete audit trail of all report changes
- **Real-time Updates**: Department assignment and status changes

### 👥 User Roles

| Role           | Permissions                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| **Admin**      | Full system access, user management, report approval, department assignment |
| **Department** | View assigned reports, update status, add remarks, process reports          |
| **Staff**      | View department reports, update status, add work logs                       |
| **Client**     | Submit reports, view report status, add feedback                            |

## Project Structure

```
report-tracking-system/
├── backend/                 # Flask REST API
│   ├── routes/             # API endpoints
│   │   ├── admin.py       # Admin operations
│   │   ├── auth.py        # Authentication
│   │   ├── client.py      # Client operations
│   │   ├── department.py  # Department operations
│   │   └── staff.py       # Staff operations
│   ├── db.py              # Database connection
│   └── main.py            # Flask app entry point
│
├── database/              # Database setup
│   └── report_tracking.sql # Database schema
│
└── frontend/              # React application
    ├── src/
    │   ├── pages/        # Page components
    │   ├── components/   # Reusable components
    │   └── services/     # API service
    └── public/           # Static assets
```

## Database Schema

### Tables

**departments**

- id, name

**users**

- id, name, email, password, role, department_id

**reports**

- id, title, description, client_id, department_id, status, created_at

**report_logs**

- id, report_id, old_department, new_department, updated_by, remarks, date_updated

## API Endpoints

### Admin Routes

- `GET /admin/reports` - Get all reports (with filters)
- `GET /admin/reports/{id}` - Get report with history
- `PUT /admin/assign/{id}` - Assign report to department
- `POST /admin/reports/{id}/approve` - Approve report
- `POST /admin/reports/{id}/reject` - Reject report
- `GET /admin/departments` - Get all departments
- `POST /admin/create-user` - Create staff/department user
- `GET /admin/users` - Get all users

### Department Routes

- `GET /department/reports/{dept_id}` - Get assigned reports
- `GET /department/report/{id}` - Get report details
- `PUT /department/report/{id}/status` - Update report status
- `POST /department/report/{id}/remark` - Add remarks
- `PUT /department/report/{id}/reassign` - Reassign to another department

### Client Routes

- `POST /client/report` - Submit new report
- `GET /client/reports/{user_id}` - Get user's reports
- `GET /client/report/{id}` - Get report details
- `POST /client/report/{id}/feedback` - Add feedback

### Staff Routes

- `GET /staff/reports/{dept_id}` - Get department reports
- `GET /staff/report/{id}` - Get report details
- `PUT /staff/report/{id}/status` - Update status
- `POST /staff/report/{id}/log` - Add work log
- `GET /staff/department/{dept_id}/stats` - Get department statistics

## Setup Instructions

### Prerequisites

- Python 3.7+
- Node.js 12+
- MySQL 5.7+

### Backend Setup

1. **Install dependencies**

```bash
cd backend
pip install flask flask-cors mysql-connector-python bcrypt
```

2. **Database setup**

```bash
mysql -u root < ../database/report_tracking.sql
```

3. **Configure database connection** (backend/db.py)

```python
connection = mysql.connector.connect(
    host="localhost",
    user="root",
    password="your_password",
    database="report_tracking"
)
```

4. **Run the API**

```bash
python main.py
```

The API runs on `http://127.0.0.1:5000`

### Frontend Setup

1. **Install dependencies**

```bash
cd frontend
npm install
```

2. **Configure environment variables**

Copy the example file and set your API URL and Google client ID:

```bash
cd frontend
copy .env.example .env.local
```

Then open `frontend/.env.local` and set:

```env
REACT_APP_API_URL=http://127.0.0.1:5000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

3. **Configure backend environment**

Copy the backend example env if you don't already have it:

```bash
cd ../backend
copy .env.example .env.local
```

Then open `backend/.env.local` and set:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_DATABASE=report_tracking
SECRET_KEY=replace_with_a_strong_secret
TOKEN_MAX_AGE=28800

EMAIL_PROVIDER=gmail
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
EMAIL_FROM=your@gmail.com
GOOGLE_CLIENT_ID=your-google-client-id
```

4. **Start development server**

```bash
npm start
```

The frontend runs on `http://localhost:3000`

## Default Test Accounts

| Email             | Password  | Role       | Department     |
| ----------------- | --------- | ---------- | -------------- |
| admin@example.com | admin123  | admin      | -              |
| mayor@example.com | admin123  | department | Mayor's Office |
| juan@example.com  | client123 | client     | -              |
| maria@example.com | client123 | client     | -              |

## Report Status Workflow

```
Pending
   ↓
(Admin assigns to department)
   ↓
Assigned
   ↓
(Department updates)
   ↓
Processing / Under Review
   ↓
Completed / Approved / Rejected
```

## Key Features Details

### Report Assignment

- Admin can assign pending reports to specific departments
- Each assignment is logged with timestamp and admin info
- Departments receive notifications of new assignments

### Status Tracking

- Multiple status options for different workflows
- Automatic logging of all status changes
- History view shows complete timeline

### Department Management

- View all city departments
- Staff count per department
- Pending reports statistics
- Easy report reassignment between departments

### Audit Trail

- Every action is logged
- View who made changes and when
- Remarks and comments attached to changes
- Complete report history

## Report Status Values

- **Pending** - Initial state, waiting for assignment
- **Assigned** - Assigned to department, waiting for action
- **Under Review** - Being reviewed by department
- **Processing** - Active work in progress
- **Approved** - Admin approved
- **Rejected** - Admin rejected (with reason)
- **Completed** - Work completed by department

## Common Tasks

### Submit a Report (As Client)

1. Login as client
2. Navigate to "Submit Report"
3. Fill in title and description
4. Click Submit
5. Track status in your dashboard

### Assign Report (As Admin)

1. Go to Reports tab
2. Select a department from dropdown
3. Click confirm
4. Report is now assigned with timestamp logged

### Update Report Status (As Department)

1. Login as department staff
2. View your assigned reports
3. Update status as work progresses
4. Add remarks/comments

### Approve/Reject Report (As Admin)

1. Review report details
2. Click "Review" button
3. Select Approve or Reject
4. Add notes (required for rejection)
5. Submit

## Troubleshooting

### Database Connection Error

- Verify MySQL is running
- Check database credentials in `backend/db.py`
- Ensure database `report_tracking` exists

### API Not Responding

- Check that backend is running on port 5000
- Verify no port conflicts
- Check Flask logs for errors

### Frontend Not Loading

- Ensure Node.js server is running
- Check that API_URL in frontend points to correct backend
- Clear browser cache and reload

## Security Considerations

- All passwords are hashed using bcrypt
- SQL injection protection via parameterized queries
- CORS enabled for development (restrict in production)
- Role-based access control on all endpoints
- Session-based authentication recommended for production

## Future Enhancements

- Email notifications for status changes
- Advanced search and filtering
- Report categorization/tagging
- SLA tracking
- Performance metrics dashboard
- Document attachment support
- Mobile app

## Support

For issues or questions, check the error logs:

- **Backend**: Console output from Flask
- **Frontend**: Browser console (F12)
- **Database**: MySQL error logs

## License

MIT License - Feel free to use and modify

---

**Last Updated**: March 1, 2026
**Version**: 1.0
