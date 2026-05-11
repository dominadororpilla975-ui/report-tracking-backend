import os
import bcrypt
from flask import Blueprint, request, jsonify, url_for, g
from werkzeug.utils import secure_filename
from db import get_db, get_dict_cursor
from config import build_frontend_url
from routes.auth import verify_auth_token
from email_service import send_email, send_assignment_email

admin = Blueprint("admin", __name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@admin.before_request
def require_admin_token():
    if request.method == 'OPTIONS':
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"message": "Authorization token required"}), 401

    token = auth_header.split(" ", 1)[1].strip()
    user = verify_auth_token(token)
    if not user:
        return jsonify({"message": "Invalid or expired token"}), 401

    if user.get("role") != "admin":
        return jsonify({"message": "Admin privileges required"}), 403

    g.user = user

def send_welcome_email(email, name, password, user_type=None):
    try:
        from config import SMTP_HOST, BREVO_API_KEY, EMAIL_FROM
        print(f"[EMAIL DEBUG] SMTP_HOST={SMTP_HOST}, BREVO_API_KEY={'*' * 5 if BREVO_API_KEY else 'EMPTY'}, EMAIL_FROM={EMAIL_FROM}")
        result = send_email(email, password, recipient_name=name)
        print(f"[WELCOME EMAIL] Email sent successfully to {email}: {result}")
        return True
    except Exception as err:
        import traceback
        print(f"[WELCOME EMAIL] Send failed for {email}: {err}")
        print(traceback.format_exc())
        return False


@admin.route('/create-client', methods=['POST'])
def create_client_route():
    data = request.json if request.is_json else request.form.to_dict()
    email = data.get('email')
    name = data.get('name') or (email.split('@')[0].replace('.', ' ').replace('_', ' ').title() if email else None)

    if not email:
        return jsonify({"message": "Email is required"}), 400

    try:
        from client_utils import create_client_account
        client_id, temp_password, email_sent = create_client_account(email, name)

        if temp_password is None:
            return jsonify({
                "message": "Client already exists",
                "client_id": client_id,
                "email_sent": email_sent,
            }), 200

        return jsonify({
            "message": "Client account created successfully",
            "client_id": client_id,
            "email_sent": email_sent,
            "temp_password": temp_password if not email_sent else None,
        }), 201
    except Exception as err:
        print(f"[CREATE CLIENT ERROR] {err}")
        return jsonify({"message": f"Error creating client account: {str(err)}"}), 500


# =============== REPORTS MANAGEMENT ===============

# Get all reports with filters
@admin.route('/admin/reports')
def all_reports():
    db = None
    try:
        status = request.args.get('status')
        department_id = request.args.get('department_id')
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        query = "SELECT r.*, d.name as department_name, c.name as client_name FROM reports r LEFT JOIN departments d ON r.department_id = d.id LEFT JOIN users c ON r.client_id = c.id WHERE 1=1"
        params = []
        
        if status:
            query += " AND r.status = %s"
            params.append(status)
        
        if department_id:
            query += " AND r.department_id = %s"
            params.append(department_id)
        
        query += " ORDER BY r.created_at DESC"
        cursor.execute(query, params)
        reports = cursor.fetchall()
        cursor.close()
        return jsonify(reports), 200
    except Exception as e:
        print(f"[ADMIN REPORTS ERROR] {e}")
        return jsonify({"message": "Error fetching reports"}), 500
    finally:
        if db:
            db.close()

# Get report details with history
@admin.route('/admin/reports/<int:report_id>')
def get_report_detail(report_id):
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get report details
        cursor.execute("""
            SELECT r.*, d.name as department_name, c.name as client_name 
            FROM reports r 
            LEFT JOIN departments d ON r.department_id = d.id 
            LEFT JOIN users c ON r.client_id = c.id 
            WHERE r.id = %s
        """, (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404

        if report.get('attachment_path'):
            filename = os.path.basename(report['attachment_path'])
            report['attachment_url'] = url_for('client.serve_attachment', filename=filename, _external=True)
            report['attachment_path'] = filename

        # Get history/logs
        cursor.execute("""
            SELECT rl.*, u.name as updated_by_name, od.name as old_dept, nd.name as new_dept 
            FROM report_logs rl 
            LEFT JOIN users u ON rl.updated_by = u.id 
            LEFT JOIN departments od ON rl.old_department = od.id 
            LEFT JOIN departments nd ON rl.new_department = nd.id 
            WHERE rl.report_id = %s 
            ORDER BY rl.date_updated DESC
        """, (report_id,))
        logs = cursor.fetchall()
        
        cursor.close()
        return jsonify({"report": report, "history": logs}), 200
    except Exception as e:
        print(f"[ADMIN REPORT DETAIL ERROR] {e}")
        return jsonify({"message": "Error fetching report"}), 500
    finally:
        if db:
            db.close()

# Assign report to department
@admin.route('/admin/assign/<int:report_id>', methods=['PUT'])
def assign_report(report_id):
    db = None
    try:
        data = request.get_json()
        
        departments = data.get('departments', [])
        if isinstance(departments, list) and len(departments) > 0:
            departments = [int(d) for d in departments]
            new_dept = departments[0]
        else:
            new_dept = data.get('department_id')
            if new_dept:
                new_dept = int(new_dept)
                departments = [new_dept]
            else:
                return jsonify({"message": "department_id or departments array required"}), 400
        
        new_dept = int(new_dept)
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get current report info and client contact data
        cursor.execute(
            "SELECT r.*, c.email AS client_email, c.name AS client_name "
            "FROM reports r LEFT JOIN users c ON r.client_id = c.id WHERE r.id = %s",
            (report_id,),
        )
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        old_dept = report.get('department_id')
        client_email = report.get('client_email')
        client_name = report.get('client_name')
        
        # Allow admin to mark physical pickup
        requires_pickup = 1 if data.get('requires_physical_pickup') else 0
        pickup_info = data.get('physical_pickup_info')

        cursor.close()
        cursor = db.cursor()
        
        # Check if this is a single department or multi-department workflow
        if departments and isinstance(departments, list) and len(departments) > 0:
            # Multi-department workflow - create workflow routes for each department
            cursor.execute("""
                UPDATE reports
                SET department_id=%s, status='Assigned', requires_physical_pickup=%s, physical_pickup_info=%s,
                    total_workflow_steps=%s, current_workflow_step=3
                WHERE id=%s
            """, (new_dept, requires_pickup, pickup_info, max(6, 5 + len(departments)), report_id))
            
            # Clear any existing workflow routes for this report
            cursor.execute("DELETE FROM report_workflow_routes WHERE report_id = %s", (report_id,))
            
            # Create workflow route entries for each department
            for step, dept_id in enumerate(departments, 1):
                cursor.execute("""
                    INSERT INTO report_workflow_routes 
                    (report_id, step_number, department_id, status)
                    VALUES (%s, %s, %s, 'Pending')
                """, (report_id, 3 + step, dept_id))
        else:
            # Single department assignment - Update to Step 3: Department Assigned
            cursor.execute("""
                UPDATE reports
                SET department_id=%s, status='Assigned', requires_physical_pickup=%s, physical_pickup_info=%s,
                    current_workflow_step=3
                WHERE id=%s
            """, (new_dept, requires_pickup, pickup_info, report_id))
        
        # Log the assignment - Step 3: Department Assigned
        updated_by = data.get('updated_by', 1)
        remark = "Step 3: Department Assigned"
        if requires_pickup:
            remark += " (Physical paper pickup required)"

        cursor.execute("""
            INSERT INTO report_logs (report_id, old_department, new_department, updated_by, action, remarks)
            VALUES (%s, %s, %s, %s, 'step3_assigned', %s)
        """, (report_id, old_dept, new_dept, updated_by, remark))
        
        db.commit()

        # Send notification email to the client when the report is assigned
        try:
            if client_email:
                dept_cursor = get_dict_cursor(db)
                dept_cursor.execute("SELECT name FROM departments WHERE id = %s", (new_dept,))
                dept_record = dept_cursor.fetchone()
                dept_cursor.close()
                department_name = dept_record["name"] if dept_record else f"Department {new_dept}"
                report_link = build_frontend_url("login")
                send_assignment_email(
                    to_email=client_email,
                    recipient_name=client_name,
                    report_title=report.get("title", "Your report"),
                    department_name=department_name,
                    report_link=report_link,
                )
        except Exception as email_err:
            print(f"[ASSIGN EMAIL ERROR] {email_err}")

        cursor.close()
        return jsonify({
            "message": "Report assigned to department successfully",
            "workflow_step": 3,
            "workflow_step_name": "Step 3: Department Assigned"
        }), 200
    except Exception as e:
        print(f"[ADMIN ASSIGN ERROR] {e}")
        return jsonify({"message": f"Error assigning report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Approve report
@admin.route('/admin/reports/<int:report_id>/approve', methods=['POST'])
def approve_report(report_id):
    db = None
    try:
        data = request.json
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get current report info
        cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        # Update to Step 6: Approved
        cursor.close()
        cursor = db.cursor()
        
        cursor.execute("""
            UPDATE reports
            SET status='Approved', current_workflow_step=6
            WHERE id=%s
        """, (report_id,))
        
        updated_by = data.get('updated_by', 1)
        
        # Log the approval - Step 6: Approved
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'step6_approved', %s)
        """, (report_id, updated_by, "Step 6: Report Approved - Process Complete"))
        
        db.commit()
        cursor.close()
        return jsonify({
            "message": "Report approved successfully",
            "workflow_step": 6,
            "workflow_step_name": "Step 6: Approved"
        }), 200
    except Exception as e:
        print(f"[ADMIN APPROVE ERROR] {e}")
        return jsonify({"message": f"Error approving report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Admin review report (marks as reviewed - Step 2 complete)
@admin.route('/admin/review/<int:report_id>', methods=['POST'])
def admin_review_report(report_id):
    db = None
    try:
        data = request.json
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get current report info
        cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        # Update to Step 2: Admin Review complete, ready for assignment
        cursor.close()
        cursor = db.cursor()
        
        cursor.execute("""
            UPDATE reports
            SET current_workflow_step = 2
            WHERE id = %s
        """, (report_id,))
        
        # Log the admin review - Step 2: Admin Review
        updated_by = data.get('updated_by', 1)
        
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'step2_reviewed', %s)
        """, (report_id, updated_by, "Step 2: Admin Review completed - Ready for department assignment"))
        
        db.commit()
        cursor.close()
        return jsonify({
            "message": "Report reviewed successfully",
            "workflow_step": 2,
            "workflow_step_name": "Step 2: Admin Review Complete"
        }), 200
    except Exception as e:
        print(f"[ADMIN REVIEW ERROR] {e}")
        return jsonify({"message": f"Error reviewing report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Reject report
@admin.route('/admin/reports/<int:report_id>/reject', methods=['POST'])
def reject_report(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('notes'):
            return jsonify({"message": "Rejection reason (notes) is required"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute("""
            UPDATE reports
            SET status='Rejected'
            WHERE id=%s
        """, (report_id,))
        
        updated_by = data.get('updated_by', 1)
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, remarks)
            VALUES (%s, %s, %s)
        """, (report_id, updated_by, data['notes']))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Report rejected"}), 200
    except Exception as e:
        print(f"[ADMIN REJECT ERROR] {e}")
        return jsonify({"message": f"Error rejecting report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Admin add comment to report
@admin.route('/admin/report/<int:report_id>/comment', methods=['POST'])
def add_admin_comment(report_id):
    db = None
    try:
        data = request.json
        if not data.get('comment'):
            return jsonify({"message": "Comment is required"}), 400

        db = get_db()
        cursor = get_dict_cursor(db)
        cursor.execute("SELECT id FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404

        updated_by = data.get('updated_by', 1)
        cursor.close()
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'admin_comment', %s)
        """, (report_id, updated_by, data['comment']))
        db.commit()
        cursor.close()
        return jsonify({"message": "Comment added successfully"}), 201
    except Exception as e:
        print(f"[ADMIN COMMENT ERROR] {e}")
        return jsonify({"message": f"Error adding comment: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# =============== DEPARTMENTS MANAGEMENT ===============

# Get all departments
@admin.route('/admin/departments')
def get_departments():
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        cursor.execute("""
            SELECT
                d.id,
                d.name,
                COUNT(DISTINCT u.id) AS user_count,
                SUM(CASE WHEN r.department_id = d.id THEN 1 ELSE 0 END) AS report_count,
                SUM(CASE WHEN r.department_id = d.id AND r.status = 'Assigned' THEN 1 ELSE 0 END) AS assigned_report_count
            FROM departments d
            LEFT JOIN users u ON u.department_id = d.id AND u.role IN ('staff', 'department')
            LEFT JOIN reports r ON r.department_id = d.id
            GROUP BY d.id
            ORDER BY d.name
        """)
        departments = cursor.fetchall()
        cursor.close()
        return jsonify(departments), 200
    except Exception as e:
        print(f"[GET DEPARTMENTS ERROR] {e}")
        return jsonify({"message": "Error fetching departments"}), 500
    finally:
        if db:
            db.close()

# Create a new department
@admin.route('/admin/departments', methods=['POST'])
def create_department():
    db = None
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({"message": "Department name is required"}), 400

        db = get_db()
        cursor = get_dict_cursor(db)
        cursor.execute("SELECT id FROM departments WHERE LOWER(name)=LOWER(%s)", (name,))
        if cursor.fetchone():
            cursor.close()
            return jsonify({"message": "Department already exists"}), 409

        cursor.execute("INSERT INTO departments (name) VALUES (%s)", (name,))
        db.commit()
        department_id = cursor.lastrowid
        cursor.close()
        return jsonify({"message": "Department created successfully", "department_id": department_id}), 201
    except Exception as e:
        print(f"[CREATE DEPARTMENT ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": f"Error creating department: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Restore missing default departments
@admin.route('/admin/departments/restore-defaults', methods=['POST'])
def restore_default_departments():
    db = None
    default_departments = [
        'Office of the Mayor',
        'Municipal Treasurer''s Office',
        'Municipal Assessor''s Office',
        'Municipal Budget Office',
        'Municipal Accountant''s Office',
        'Municipal Civil Registrar''s Office',
        'Municipal Engineer''s Office',
        'Municipal Planning and Development Office',
        'Municipal Health Office',
        'Municipal Social Welfare and Development Office',
        'Municipal Police Office',
        'Bureau of Fire Protection',
        'Municipal Agricultural Office',
        'Municipal Environment and Natural Resources Office',
        'Municipal Tourism Office',
        'Municipal General Services Office',
        'Municipal Legal Office',
        'Municipal Information and Communications Technology Office',
        'Municipal Business Permits and Licensing Office',
    ]

    try:
        db = get_db()
        cursor = db.cursor()
        inserted = 0
        for name in default_departments:
            cursor.execute("SELECT id FROM departments WHERE LOWER(name)=LOWER(%s)", (name,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO departments (name) VALUES (%s)", (name,))
                inserted += 1

        db.commit()
        cursor.close()
        return jsonify({"message": f"Restored {inserted} missing default departments"}), 200
    except Exception as e:
        print(f"[RESTORE DEFAULT DEPARTMENTS ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": "Error restoring default departments"}), 500
    finally:
        if db:
            db.close()

# Get department with staff count and pending reports
@admin.route('/admin/departments/<int:dept_id>')
def get_department_stats(dept_id):
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        
        cursor.execute("SELECT * FROM departments WHERE id = %s", (dept_id,))
        dept = cursor.fetchone()
        
        if not dept:
            cursor.close()
            return jsonify({"message": "Department not found"}), 404
        
        # Get staff count
        cursor.execute("SELECT COUNT(*) as staff_count FROM users WHERE department_id = %s AND role IN ('staff', 'department')", (dept_id,))
        staff = cursor.fetchone()
        
        # Get pending reports
        cursor.execute("SELECT COUNT(*) as pending_count FROM reports WHERE department_id = %s AND status = 'Assigned'", (dept_id,))
        reports = cursor.fetchone()
        
        cursor.close()
        dept['staff_count'] = staff['staff_count']
        dept['pending_reports'] = reports['pending_count']
        
        return jsonify(dept), 200
    except Exception as e:
        print(f"[GET DEPARTMENT STATS ERROR] {e}")
        return jsonify({"message": "Error fetching department stats"}), 500
    finally:
        if db:
            db.close()

# =============== USERS MANAGEMENT ===============

# Create staff, department, or client user
@admin.route('/admin/create-user', methods=['POST'])
def create_user():
    db = None
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('name') or not data.get('email') or not data.get('password'):
            return jsonify({"message": "Name, email, and password are required"}), 400
        
        if len(data['password']) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400
        
        if data.get('role') not in ['staff', 'department', 'client']:
            return jsonify({"message": "Role must be staff, department, or client"}), 400
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email=%s", (data["email"],))
        if cursor.fetchone():
            cursor.close()
            return jsonify({"message": "Email already exists"}), 409
        
        cursor.close()
        cursor = db.cursor()

        department_id = data.get("department_id")
        if department_id in ("", None):
            department_id = None
        else:
            try:
                department_id = int(department_id)
            except (ValueError, TypeError):
                department_id = None
        
        if data["role"] == "client":
            department_id = None
        elif data["role"] == "department":
            if department_id is None:
                cursor.close()
                return jsonify({"message": "Department selection is required for department head accounts."}), 400
            cursor.execute("SELECT id FROM departments WHERE id = %s", (department_id,))
            if not cursor.fetchone():
                cursor.close()
                return jsonify({"message": "Selected department does not exist."}), 400

        # Hash password and insert user
        hashed = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())
        cursor.execute("""
            INSERT INTO users (name,email,password,role,department_id)
            VALUES (%s,%s,%s,%s,%s)
        """, (data["name"], data["email"], hashed.decode('utf-8'), data["role"], department_id))
        
        db.commit()
        user_id = cursor.lastrowid
        cursor.close()

        notification_msg = ""
        try:
            send_welcome_email(data["email"], data["name"], data["password"])
        except Exception as mail_err:
            notification_msg = f" Email notification could not be sent: {str(mail_err)}"
            print(f"[EMAIL ERROR] {mail_err}")
        
        return jsonify({"message": f"User created successfully.{notification_msg}", "user_id": user_id}), 201
    
    except Exception as e:
        print(f"[CREATE USER ERROR] {e}")
        return jsonify({"message": f"Error creating user: {str(e)}"}), 400
    finally:
        if db:
            db.close()

# Get all users (with optional role filter)
@admin.route('/admin/users')
def get_users():
    db = None
    try:
        role = request.args.get('role')
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        if role:
            cursor.execute("""
                SELECT u.id, u.name, u.email, u.role, u.temp_password, d.name as department_name 
                FROM users u 
                LEFT JOIN departments d ON u.department_id = d.id 
                WHERE u.role = %s
                ORDER BY u.name
            """, (role,))
        else:
            cursor.execute("""
                SELECT u.id, u.name, u.email, u.role, u.temp_password, d.name as department_name 
                FROM users u 
                LEFT JOIN departments d ON u.department_id = d.id 
                ORDER BY u.name
            """)
        
        users = cursor.fetchall()
        cursor.close()
        return jsonify(users), 200
    except Exception as e:
        print(f"[GET USERS ERROR] {e}")
        return jsonify({"message": "Error fetching users"}), 500
    finally:
        if db:
            db.close()

# Delete user account
@admin.route('/admin/user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            cursor.close()
            return jsonify({"message": "User not found"}), 404

        # Clean up references before deleting user to satisfy foreign key constraints
        cursor.execute("UPDATE reports SET client_id = NULL WHERE client_id = %s", (user_id,))
        cursor.execute("UPDATE report_workflow_routes SET assigned_user_id = NULL WHERE assigned_user_id = %s", (user_id,))
        cursor.execute("DELETE FROM report_logs WHERE updated_by = %s", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))

        db.commit()
        cursor.close()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        print(f"[DELETE USER ERROR] {e}")
        return jsonify({"message": f"Error deleting user: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Bulk convert staff->department (useful for migrating existing staff accounts)
@admin.route('/admin/convert-staff-to-department', methods=['PUT'])
def bulk_convert_staff():
    db = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            UPDATE users
            SET role='department'
            WHERE role='staff' AND department_id IS NOT NULL
        """)
        affected = cursor.rowcount
        db.commit()
        cursor.close()
        return jsonify({"message": f"Converted {affected} users to department"}), 200
    except Exception as e:
        print(f"[BULK CONVERT ERROR] {e}")
        return jsonify({"message": f"Error converting users: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# =============== PAPER ASSIGNMENT (ADMIN SUBMIT) ===============

# Submit paper assignment from admin to department
@admin.route('/admin/submit-paper', methods=['POST'])
def submit_paper_assignment():
    db = None
    try:
        if request.is_json:
            data = request.json
        else:
            data = request.form.to_dict()

        # Validate required fields
        if not data.get('title') or not data.get('description'):
            return jsonify({"message": "Title and description are required"}), 400

        # Handle departments for workflow path - BACKWARD COMPAT
        dept_string = data.get('departments')  # Frontend sends comma-separated "7,10,1"
        if dept_string:
            departments = [int(d.strip()) for d in dept_string.split(',')]
            primary_dept = departments[0]
        elif data.get('department_id'):
            primary_dept = data.get('department_id')
            departments = [int(primary_dept)]
        else:
            return jsonify({"message": "department_id or departments required"}), 400

        admin_id = data.get('admin_id', 1)  # Default admin ID
        requires_pickup = 1 if str(data.get('requires_physical_pickup')).lower() in ('1', 'true', 'yes', 'on') else 0
        pickup_info = data.get('physical_pickup_info')

        client_id = data.get('client_id')
        client_email = data.get('client_email')
        client_name = data.get('client_name')
        temp_pass = None
        email_sent = False

        report_client_email = client_email
        report_client_name = client_name

        if client_email and not client_id:
            from client_utils import create_client_account
            client_id, temp_pass, email_sent = create_client_account(client_email, client_name)
            print(f"Created client account for report: {client_email} -> client_id={client_id}")
            report_client_email = client_email
            report_client_name = client_name

        if client_id in ("", None):
            client_id = admin_id
        else:
            try:
                client_id = int(client_id)
            except (ValueError, TypeError):
                client_id = admin_id

        if client_id and not report_client_email and client_id != admin_id:
            db_lookup = get_db()
            cursor_lookup = get_dict_cursor(db_lookup)
            cursor_lookup.execute(
                "SELECT email, name FROM users WHERE id = %s",
                (client_id,),
            )
            user_record = cursor_lookup.fetchone()
            cursor_lookup.close()
            db_lookup.close()
            if user_record:
                report_client_email = user_record.get('email')
                report_client_name = user_record.get('name')

        department_id = data.get('department_id')
        if department_id is None and departments:
            department_id = primary_dept
        try:
            department_id = int(department_id)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid department selected"}), 400

        db = get_db()
        cursor = db.cursor()

        # Insert report with primary dept
        cursor.execute("""
            INSERT INTO reports (title, description, client_id, department_id, status, requires_physical_pickup, physical_pickup_info, budget, client_email, client_name, total_workflow_steps, current_workflow_step)
            VALUES (%s, %s, %s, %s, 'Assigned', %s, %s, %s, %s, %s, %s, 3)
        """, (
            data['title'],
            data['description'],
            client_id,
            primary_dept,
            requires_pickup,
            pickup_info,
            data.get('budget', 0),
            report_client_email,
            report_client_name,
            len(departments) + 5,  # 5 base steps + num depts
        ))

        report_id = cursor.lastrowid

        attachment_path = None
        if 'attachments' in request.files and not request.is_json:
            files = request.files.getlist('attachments')
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            for i, file in enumerate(files):
                if file and file.filename:
                    safe_name = secure_filename(file.filename)
                    filename = f"admin_report_{report_id}_{i+1}_{safe_name}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    if not attachment_path:
                        attachment_path = filename

            if attachment_path:
                cursor.execute("""
                    UPDATE reports SET attachment_path = %s WHERE id = %s
                """, (attachment_path, report_id))

        # Log submission
        cursor.execute("""
            INSERT INTO report_logs (report_id, new_department, updated_by, action, remarks)
            VALUES (%s, %s, %s, 'paper_submitted', %s)
        """, (report_id, primary_dept, admin_id, f"Paper submitted with workflow: {', '.join(str(d) for d in departments)}"))

        # Create workflow routes if multi-dept
        if len(departments) > 1:
            cursor.execute("DELETE FROM report_workflow_routes WHERE report_id = %s", (report_id,))
            for i, dept_id in enumerate(departments, 1):
                cursor.execute("""
                    INSERT INTO report_workflow_routes (report_id, step_number, department_id, status)
                    VALUES (%s, %s, %s, 'Pending')
                """, (report_id, 3 + i, dept_id))

        db.commit()
        cursor.close()

        response_payload = {
            "message": "Paper assignment submitted successfully",
            "report_id": report_id,
        }
        if client_email and temp_pass is not None:
            response_payload["client_account"] = {
                "client_id": client_id,
                "email": client_email,
                "email_sent": email_sent,
                "temp_password": temp_pass if not email_sent else None,
            }

        return jsonify(response_payload), 201

    except Exception as e:
        print(f"[SUBMIT PAPER ERROR] {e}")
        return jsonify({"message": f"Error submitting paper: {str(e)}"}), 500
    finally:
        if db:
            db.close()


@admin.route('/admin/resend-client-welcome', methods=['POST'])
def resend_client_welcome():
    db = None
    try:
        if request.is_json:
            data = request.json
        else:
            data = request.form.to_dict()

        client_id = data.get('client_id')
        client_email = data.get('client_email')
        client_name = data.get('client_name')

        if not client_id and not client_email:
            return jsonify({"message": "client_id or client_email is required"}), 400

        if client_id:
            try:
                client_id = int(client_id)
            except (ValueError, TypeError):
                return jsonify({"message": "Invalid client_id"}), 400

            db = get_db()
            cursor = get_dict_cursor(db)
            cursor.execute(
                "SELECT email, name FROM users WHERE id = %s AND role = 'client'",
                (client_id,),
            )
            user = cursor.fetchone()
            cursor.close()
            if not user:
                return jsonify({"message": "Client account not found"}), 404
            client_email = user.get('email')
            client_name = client_name or user.get('name')

        if not client_email:
            return jsonify({"message": "client_email is required"}), 400

        from client_utils import resend_welcome_email
        client_id, temp_pass, email_sent = resend_welcome_email(client_email, client_name)

        return jsonify({
            "message": "Welcome email resent successfully" if email_sent else "Welcome email resend failed",
            "client_id": client_id,
            "email": client_email,
            "email_sent": email_sent,
            "temp_password": temp_pass if not email_sent else None,
        }), 200
    except Exception as e:
        print(f"[RESEND CLIENT WELCOME ERROR] {e}")
        return jsonify({"message": f"Error resending welcome email: {str(e)}"}), 500
    finally:
        if db:
            db.close()


# =============== BUDGET-BASED REASSIGNMENT ===============

# Reassign report to different department (with budget consideration)
@admin.route('/admin/reassign/<int:report_id>', methods=['PUT'])
def reassign_report(report_id):
    db = None
    try:
        data = request.json
        
        if data.get('department_id') is None and data.get('department_id') != "admin":
            # Allow returning to admin (no department)
            new_dept = None
        elif data.get('department_id') == "admin":
            # Returning to admin - set department to null
            new_dept = None
        else:
            new_dept = data.get('department_id')
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get current report info
        cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        old_dept = report.get('department_id')
        reassign_reason = data.get('reason', 'Reassigned')
        updated_by = data.get('updated_by', 1)
        new_budget = data.get('budget', report.get('budget', 0))
        
        # Get status from request or determine default
        new_status = data.get('status')
        if not new_status:
            # Determine new status - if returning to admin, set to Pending
            new_status = 'Pending' if new_dept is None else 'Assigned'
        
        cursor.close()
        cursor = db.cursor()
        
        # Update report with new department and budget
        cursor.execute("""
            UPDATE reports
            SET department_id=%s, budget=%s, reassign_reason=%s, status=%s
            WHERE id=%s
        """, (new_dept, new_budget, reassign_reason, new_status, report_id))
        
        # Log the reassignment
        action_remarks = "Returned to Admin" if new_dept is None else f"Reassigned: {reassign_reason}"
        if new_status == 'Approved':
            action_remarks = f"Approved by department: {reassign_reason}"
        elif new_status == 'Rejected':
            action_remarks = f"Rejected by department: {reassign_reason}"
            
        cursor.execute("""
            INSERT INTO report_logs (report_id, old_department, new_department, updated_by, action, remarks)
            VALUES (%s, %s, %s, %s, 'reassigned', %s)
        """, (report_id, old_dept, new_dept, updated_by, action_remarks))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Report reassigned successfully"}), 200
    except Exception as e:
        print(f"[REASSIGN ERROR] {e}")
        return jsonify({"message": f"Error reassigning report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Delete report
@admin.route('/admin/report/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Check if report exists
        cursor.execute("SELECT id FROM reports WHERE id = %s", (report_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        # Delete related records first (due to foreign key constraints)
        # Delete workflow routes first
        cursor.execute("DELETE FROM report_workflow_routes WHERE report_id = %s", (report_id,))
        
        # Delete logs
        cursor.execute("DELETE FROM report_logs WHERE report_id = %s", (report_id,))
        
        # Delete the report
        cursor.execute("DELETE FROM reports WHERE id = %s", (report_id,))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Report deleted successfully"}), 200
    except Exception as e:
        print(f"[DELETE ERROR] {e}")
        return jsonify({"message": f"Error deleting report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# =============== DASHBOARD STATISTICS ===============

# Get dashboard statistics for charts
@admin.route('/admin/stats')
def get_dashboard_stats():
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Status distribution
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM reports 
            GROUP BY status
        """)
        status_counts = cursor.fetchall()
        
        # Department workload
        cursor.execute("""
            SELECT d.name as department, COUNT(r.id) as report_count
            FROM departments d
            LEFT JOIN reports r ON d.id = r.department_id
            GROUP BY d.id, d.name
            ORDER BY report_count DESC
        """)
        dept_workload = cursor.fetchall()
        
        # Monthly submission trend
        cursor.execute("""
            SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
            FROM reports
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month
        """)
        monthly_trend = cursor.fetchall()
        
        # Average resolution time (simplified calculation)
        cursor.execute("""
            SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at))) as avg_seconds
            FROM reports
            WHERE status IN ('Approved', 'Completed') AND created_at IS NOT NULL
        """)
        avg_resolution = cursor.fetchone()
        
        # Budget overview (add NULL handling)
        cursor.execute("""
            SELECT 
                COALESCE(SUM(budget), 0) as total_budget,
                COALESCE(SUM(CASE WHEN budget_approved THEN budget ELSE 0 END), 0) as approved_budget,
                COUNT(CASE WHEN budget > 0 THEN 1 END) as reports_with_budget
            FROM reports
        """)
        budget_stats = cursor.fetchall()
        
        # Top departments by resolution speed (simplified)
        cursor.execute("""
            SELECT d.name, AVG(EXTRACT(EPOCH FROM (COALESCE(r.updated_at, NOW()) - r.created_at))) as avg_seconds
            FROM reports r
            JOIN departments d ON r.department_id = d.id
            WHERE r.status IN ('Approved', 'Completed') AND r.created_at IS NOT NULL
            GROUP BY d.id, d.name
            ORDER BY avg_seconds ASC
            LIMIT 5
        """)
        top_performers = cursor.fetchall()

        
        cursor.close()
        
        return jsonify({
            "status_counts": status_counts or [],
            "department_workload": dept_workload or [],
            "monthly_trend": monthly_trend or [],
            "avg_resolution_days": (avg_resolution['avg_seconds'] / 86400.0) if avg_resolution and avg_resolution.get('avg_seconds') is not None else 0,
            "budget_stats": budget_stats[0] if budget_stats and len(budget_stats) > 0 else {
                "total_budget": 0,
                "approved_budget": 0,
                "reports_with_budget": 0
            },
            "top_performers": [
                {
                    "name": perf["name"],
                    "avg_days": perf["avg_seconds"] / 86400.0 if perf.get("avg_seconds") else 0
                } for perf in top_performers or []
            ]
        }), 200
    except Exception as e:
        print(f"[STATS ERROR] {e}")
        return jsonify({"message": f"Error fetching stats: {str(e)}"}), 500
    finally:
        if db:
            db.close()
