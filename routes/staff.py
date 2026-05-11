from flask import Blueprint, request, jsonify
from db import get_db, get_dict_cursor

staff = Blueprint("staff", __name__)

# Get department reports for staff
@staff.route('/staff/reports/<int:department_id>')
def department_reports(department_id):
    db = None
    try:
        status = request.args.get('status')  # Optional status filter
        
        db = get_db()
        cursor = get_dict_cursor(db)
        
        if status:
            cursor.execute("""
                SELECT r.*, c.name as client_name, d.name as department_name
                FROM reports r 
                LEFT JOIN users c ON r.client_id = c.id 
                LEFT JOIN departments d ON r.department_id = d.id 
                WHERE r.department_id=%s AND r.status=%s
                ORDER BY r.created_at DESC
            """, (department_id, status))
        else:
            cursor.execute("""
                SELECT r.*, c.name as client_name, d.name as department_name
                FROM reports r 
                LEFT JOIN users c ON r.client_id = c.id 
                LEFT JOIN departments d ON r.department_id = d.id 
                WHERE r.department_id=%s
                ORDER BY r.created_at DESC
            """, (department_id,))
        
        reports = cursor.fetchall()
        cursor.close()
        return jsonify(reports), 200
    except Exception as e:
        print(f"[STAFF REPORTS ERROR] {e}")
        return jsonify({"message": "Error fetching reports"}), 500
    finally:
        if db:
            db.close()

# Get single report with full history
@staff.route('/staff/report/<int:report_id>')
def get_report_detail(report_id):
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get report
        cursor.execute("""
            SELECT r.*, c.name as client_name, d.name as department_name
            FROM reports r 
            LEFT JOIN users c ON r.client_id = c.id 
            LEFT JOIN departments d ON r.department_id = d.id 
            WHERE r.id = %s
        """, (report_id,))
        
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        # Get full history/timeline
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
        print(f"[REPORT DETAIL ERROR] {e}")
        return jsonify({"message": "Error fetching report"}), 500
    finally:
        if db:
            db.close()

# Update report status (Processing, Under Review, Completed, etc)
@staff.route('/staff/report/<int:report_id>/status', methods=['PUT'])
def update_report_status(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('status'):
            return jsonify({"message": "Status is required"}), 400
        
        valid_statuses = ['Processing', 'Under Review', 'Completed', 'Approved', 'Rejected']
        if data['status'] not in valid_statuses:
            return jsonify({"message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute("""
            UPDATE reports
            SET status=%s
            WHERE id=%s
        """, (data['status'], report_id))
        
        # Log the status change
        remarks = data.get('remarks', f"Status updated to {data['status']}")
        updated_by = data.get('updated_by', 1)  # Staff member ID
        
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, remarks)
            VALUES (%s, %s, %s)
        """, (report_id, updated_by, remarks))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Report status updated successfully"}), 200
    except Exception as e:
        print(f"[STAFF UPDATE ERROR] {e}")
        return jsonify({"message": f"Error updating report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Add work log / update to report
@staff.route('/staff/report/<int:report_id>/log', methods=['POST'])
def add_work_log(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('log_entry'):
            return jsonify({"message": "log_entry is required"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        updated_by = data.get('updated_by', 1)
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, remarks)
            VALUES (%s, %s, %s)
        """, (report_id, updated_by, data['log_entry']))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Work log added successfully"}), 201
    except Exception as e:
        print(f"[ADD LOG ERROR] {e}")
        return jsonify({"message": f"Error adding log: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Get summary/stats for department
@staff.route('/staff/department/<int:department_id>/stats')
def get_department_stats(department_id):
    db = None
    try:
        db = get_db()
        cursor = get_dict_cursor(db)
        
        # Get total reports
        cursor.execute("""
            SELECT COUNT(*) as total FROM reports WHERE department_id=%s
        """, (department_id,))
        total = cursor.fetchone()['total']
        
        # Get reports by status
        cursor.execute("""
            SELECT status, COUNT(*) as count FROM reports WHERE department_id=%s
            GROUP BY status
        """, (department_id,))
        by_status = cursor.fetchall()
        
        # Get pending reports (for quick action)
        cursor.execute("""
            SELECT COUNT(*) as pending FROM reports 
            WHERE department_id=%s AND status IN ('Pending', 'Under Review', 'Assigned')
        """, (department_id,))
        pending = cursor.fetchone()['pending']
        
        cursor.close()
        
        return jsonify({
            "total_reports": total,
            "pending_reports": pending,
            "by_status": by_status
        }), 200
    except Exception as e:
        print(f"[STATS ERROR] {e}")
        return jsonify({"message": "Error fetching stats"}), 500
    finally:
        if db:
            db.close()
