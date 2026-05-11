-- PostgreSQL Schema for Report Tracking System
-- Converted from MySQL to PostgreSQL syntax

-- 1️⃣ Create Database (Note: Database creation is typically done outside of schema files in PostgreSQL)
-- CREATE DATABASE report_tracking;

-- Connect to the database
-- \c report_tracking;

-- 2️⃣ Departments Table
DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    signature_path VARCHAR(255) NULL
);

-- 3️⃣ Users Table
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    google_sub VARCHAR(255) NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    temp_password VARCHAR(255) NULL,
    role VARCHAR(50) CHECK (role IN ('admin','staff','client','department')) NOT NULL,
    department_id INTEGER NULL REFERENCES departments(id),
    needs_password_change BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4️⃣ Reports Table (Enhanced with Budget)
DROP TABLE IF EXISTS reports CASCADE;
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    client_id INTEGER REFERENCES users(id),
    department_id INTEGER NULL REFERENCES departments(id),
    requires_physical_pickup BOOLEAN DEFAULT FALSE,
    physical_pickup_info VARCHAR(255) NULL,
    status VARCHAR(50) CHECK (status IN (
        'Pending',
        'Under Review',
        'Assigned',
        'Processing',
        'Approved',
        'Rejected',
        'Completed'
    )) DEFAULT 'Pending',
    current_workflow_step INTEGER DEFAULT 1,
    total_workflow_steps INTEGER DEFAULT 1,
    -- Budget fields
    budget DECIMAL(15,2) DEFAULT 0,
    budget_approved BOOLEAN DEFAULT FALSE,
    reassign_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5️⃣ Report Workflow Routes Table (Multi-step approval workflow)
DROP TABLE IF EXISTS report_workflow_routes CASCADE;
CREATE TABLE report_workflow_routes (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    assigned_user_id INTEGER NULL REFERENCES users(id),
    status VARCHAR(50) CHECK (status IN ('Pending', 'In Progress', 'Approved', 'Rejected', 'Completed')) DEFAULT 'Pending',
    approver_notes TEXT,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    UNIQUE (report_id, step_number)
);

-- 6️⃣ Report Logs Table (For history / timeline)
DROP TABLE IF EXISTS report_logs CASCADE;
CREATE TABLE report_logs (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id),
    old_department INTEGER NULL REFERENCES departments(id),
    new_department INTEGER NULL REFERENCES departments(id),
    updated_by INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50),
    remarks TEXT,
    date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7️⃣ Complete Municipal LGU Departments
INSERT INTO departments (name) VALUES
('Office of the Mayor'),
('Municipal Treasurer''s Office'),
('Municipal Assessor''s Office'),
('Municipal Budget Office'),
('Municipal Accountant''s Office'),
('Municipal Civil Registrar''s Office'),
('Municipal Engineer''s Office'),
('Municipal Health Office'),
('Municipal Social Welfare and Development Office'),
('Municipal Disaster Risk Reduction and Management Office'),
('Municipal Planning and Development Office'),
('Municipal Agriculture Office'),
('Municipal Environment and Natural Resources Office'),
('Sangguniang Bayan'),
('Municipal Administrator''s Office'),
('Municipal Legal Office'),
('Municipal Tourism Office'),
('Municipal Fire Station'),
('Municipal Police Station'),
('Barangay Affairs Office')
ON CONFLICT DO NOTHING;

-- 8️⃣ Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_sub ON users(google_sub);
CREATE INDEX idx_reports_client_id ON reports(client_id);
CREATE INDEX idx_reports_department_id ON reports(department_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_report_workflow_routes_report_id ON report_workflow_routes(report_id);
CREATE INDEX idx_report_logs_report_id ON report_logs(report_id);

-- 9️⃣ Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10️⃣ Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();