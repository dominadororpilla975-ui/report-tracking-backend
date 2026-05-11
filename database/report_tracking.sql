    -- 1️⃣ Create Database
CREATE DATABASE IF NOT EXISTS report_tracking;
USE report_tracking;

-- 2️⃣ Departments Table
DROP TABLE IF EXISTS departments;
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    signature_path VARCHAR(255) NULL
) ENGINE=InnoDB;

-- 3️⃣ Users Table
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    google_sub VARCHAR(255) NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    temp_password VARCHAR(255) NULL,
    role ENUM('admin','staff','client','department') NOT NULL,
    department_id INT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

-- 4️⃣ Reports Table (Enhanced with Budget)
DROP TABLE IF EXISTS reports;
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    client_id INT,
    department_id INT NULL,
    requires_physical_pickup TINYINT(1) DEFAULT 0,
    physical_pickup_info VARCHAR(255) NULL,
    status ENUM(
        'Pending',
        'Under Review',
        'Assigned',
        'Processing',
        'Approved',
        'Rejected',
        'Completed'
    ) DEFAULT 'Pending',
    current_workflow_step INT DEFAULT 1,
    total_workflow_steps INT DEFAULT 1,
    -- Budget fields
    budget DECIMAL(15,2) DEFAULT 0,
    budget_approved TINYINT(1) DEFAULT 0,
    reassign_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

-- 5️⃣ Report Workflow Routes Table (Multi-step approval workflow)
DROP TABLE IF EXISTS report_workflow_routes;
CREATE TABLE IF NOT EXISTS report_workflow_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    step_number INT NOT NULL,
    department_id INT NOT NULL,
    assigned_user_id INT NULL,
    status ENUM('Pending', 'In Progress', 'Approved', 'Rejected', 'Completed') DEFAULT 'Pending',
    approver_notes TEXT,
    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_date DATETIME NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(id),
    UNIQUE KEY unique_report_step (report_id, step_number)
) ENGINE=InnoDB;

-- 6️⃣ Report Logs Table (For history / timeline)
DROP TABLE IF EXISTS report_logs;
CREATE TABLE IF NOT EXISTS report_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    old_department INT NULL,
    new_department INT NULL,
    updated_by INT NOT NULL,
    action VARCHAR(50),
    remarks TEXT,
    date_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (old_department) REFERENCES departments(id),
    FOREIGN KEY (new_department) REFERENCES departments(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 7️⃣ Complete Municipal LGU Departments
INSERT INTO departments (id, name) VALUES
(1, 'Office of the Mayor'),
(5, 'Municipal Treasurer''s Office'),
(6, 'Municipal Assessor''s Office'),
(7, 'Municipal Budget Office'),
(8, 'Municipal Accountant''s Office'),
(9, 'Municipal Civil Registrar''s Office'),
(10, 'Municipal Engineer''s Office'),
(11, 'Municipal Planning and Development Office'),
(12, 'Municipal Health Office'),
(13, 'Municipal Social Welfare and Development Office'),
(14, 'Municipal Police Office'),
(15, 'Bureau of Fire Protection'),
(17, 'Municipal Agricultural Office'),
(20, 'Municipal Environment and Natural Resources Office'),
(21, 'Municipal Tourism Office'),
(23, 'Municipal General Services Office'),
(24, 'Municipal Legal Office'),
(26, 'Municipal Information and Communications Technology Office'),
(32, 'Municipal Business Permits and Licensing Office');

-- 8️⃣ Department Head and Staff Accounts (All key departments - password: dept123)
INSERT INTO users (name,email,password,role,department_id) VALUES
-- Mayor's Office
('Mayor','mayor@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',1),
-- Budget
('Budget Director','budget@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',7),
-- Accounting
('Accountant','accounting@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',8),
-- Treasurer
('Treasurer','treasurer@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',5),
-- Engineering
('Engineer','engineer@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',10),
-- Planning and Development
('Planner','planner@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',11),
-- Health
('Health Officer','health@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',12),
-- Social Services
('Social Worker','social@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',13),
-- Police
('Police Chief','police@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',14),
-- Fire
('Fire Chief','fire@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',15),
-- General Services
('Services Manager','services@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',23),
-- Legal
('Legal Officer','legal@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',24),
-- IT
('IT Manager','it@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',26),
-- Business Permits
('Permits Officer','permits@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',32),
-- Environmental
('Environment Officer','environment@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',20),
-- Civil Registrar
('Registrar','registrar@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',9),
-- Assessment
('Assessor','assessor@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',6),
-- Tourism
('Tourism Officer','tourism@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',21),
-- Agriculture
('Agriculture Officer','agriculture@municipal.gov','$2b$12$EaLL2kPaKbeKzmGRDXP/zei5lW3Oraa5LgiwBfTIkOKEGMDGF9IHG','department',17);

-- 9️⃣ Admin Account (password: admin123)
INSERT INTO users (name,email,password,role) VALUES
('System Administrator','admin@municipal.gov','$2b$12$At.VI/MH.h7coaXvwv3GEuLGSQD3t9JxLF6XMpIDTk2y24OfHrhty','admin');

-- 🔟 Client Accounts (password: client123)
INSERT INTO users (name,email,password,role) VALUES
('Juan Dela Cruz','juan@municipal-report.gov','$2b$12$5pJZVSDuy8G0lEIQjJPSrODJyTRBAdTHi3L3ep3pU7Oo67fdclFDy','client'),
('Maria Santos','maria@municipal-report.gov','$2b$12$5pJZVSDuy8G0lEIQjJPSrODJyTRBAdTHi3L3ep3pU7Oo67fdclFDy','client'),
('Pedro Reyes','pedro@municipal-report.gov','$2b$12$5pJZVSDuy8G0lEIQjJPSrODJyTRBAdTHi3L3ep3pU7Oo67fdclFDy','client'),
('Rosa Garcia','rosa@municipal-report.gov','$2b$12$5pJZVSDuy8G0lEIQjJPSrODJyTRBAdTHi3L3ep3pU7Oo67fdclFDy','client');

-- 1️⃣1️⃣ TEST REPORTS (Safe to delete anytime)
INSERT INTO reports 
(title, description, client_id, department_id, total_workflow_steps)
VALUES
('TEST - Road Repair','Demo road repair request',21,7,3),
('TEST - Budget Request','Demo budget allocation',22,7,3),
('TEST - Tourism Permit','Demo tourism permit',23,20,2),
('TEST - Infrastructure Project','Demo infra project',24,11,3);

-- 1️⃣2️⃣ TEST Workflow Routes
INSERT INTO report_workflow_routes 
(report_id, step_number, department_id, assigned_user_id, status)
VALUES
-- Report 1
(1,1,7,2,'In Progress'),
(1,2,10,5,'Pending'),
(1,3,1,1,'Pending'),

-- Report 2
(2,1,7,2,'In Progress'),
(2,2,8,3,'Pending'),
(2,3,5,4,'Pending'),

-- Report 3
(3,1,20,15,'In Progress'),
(3,2,21,18,'Pending'),

-- Report 4
(4,1,11,6,'In Progress'),
(4,2,10,5,'Pending'),
(4,3,7,2,'Pending');

-- 1️⃣3️⃣ TEST Logs
INSERT INTO report_logs 
(report_id, action, remarks, updated_by)
VALUES
(1,'submitted','TEST report submitted',21),
(1,'assigned','Assigned to Budget Department',19),

(2,'submitted','TEST budget request submitted',22),
(2,'assigned','Assigned to Budget Department',19),

(3,'submitted','TEST tourism permit submitted',23),
(3,'assigned','Assigned to Environmental Office',19),

(4,'submitted','TEST infrastructure project submitted',24),
(4,'assigned','Assigned to Planning Office',19);
