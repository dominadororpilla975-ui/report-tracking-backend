import os
from flask import Blueprint, request, jsonify, url_for, send_from_directory
from werkzeug.utils import secure_filename
from db import get_db

department = Blueprint("department", __name__)
SIGNATURE_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "department_signatures")
ALLOWED_SIGNATURE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def is_allowed_signature(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_SIGNATURE_EXTENSIONS

# Get assigned reports for a department
@department.route('/department/reports/<int:department_id>')
def assigned_reports(department_id):
    db = None
    try:
        status = request.args.get('status')  # Filter by status
        
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Build query with filters
        where_conditions = ["r.department_id=%s"]
        params = [department_id]
        
        if status:
            where_conditions.append("r.status=%s")
            params.append(status)
        if request.args.get('search'):
            where_conditions.append("(r.title LIKE %s OR r.description LIKE %s)")
            params.extend([f"%{request.args.get('search')}%", f"%{request.args.get('search')}%"])
        if request.args.get('date_from'):
            where_conditions.append("r.created_at >= %s")
            params.append(request.args.get('date_from'))
        if request.args.get('date_to'):
            where_conditions.append("r.created_at <= %s")
            params.append(request.args.get('date_to'))
        
        where_clause = " AND ".join(where_conditions)
        sort = request.args.get('sort', 'created_at')
        sort_dir = request.args.get('dir', 'DESC')
        order_by = f"ORDER BY r.{sort} {sort_dir}"
        
        query = f"""
            SELECT r.*, c.name as client_name, d.name as department_name
            FROM reports r 
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE {where_clause}
            {order_by}
        """
        cursor.execute(query, params)
        
        reports = cursor.fetchall()
        cursor.close()
        return jsonify(reports), 200
    except Exception as e:
        print(f"[DEPARTMENT REPORTS ERROR] {e}")
        return jsonify({"message": "Error fetching reports"}), 500
    finally:
        if db:
            db.close()

# Get single report details
@department.route('/department/report/<int:report_id>')
def get_report_detail(report_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT r.*, c.name as client_name, d.name as department_name
            FROM reports r 
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE r.id=%s
        """, (report_id,))
        
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404

        if report.get('attachment_path'):
            filename = os.path.basename(report['attachment_path'])
            report['attachment_url'] = url_for('client.serve_attachment', filename=filename, _external=True)
            report['attachment_path'] = filename

        # Get history
        cursor.execute("""
            SELECT rl.*, u.name as updated_by_name
            FROM report_logs rl 
            LEFT JOIN users u ON rl.updated_by = u.id 
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

# Get reference list of departments for department users
@department.route('/department/departments')
def get_departments():
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, name FROM departments ORDER BY name ASC")
        departments = cursor.fetchall()
        cursor.close()
        return jsonify(departments), 200
    except Exception as e:
        print(f"[DEPARTMENT LIST ERROR] {e}")
        return jsonify({"message": "Error fetching departments"}), 500
    finally:
        if db:
            db.close()


@department.route('/department/signature/<path:filename>')
def serve_department_signature(filename):
    try:
        return send_from_directory(SIGNATURE_FOLDER, filename)
    except Exception as e:
        print(f"[SIGNATURE SERVE ERROR] {e}")
        return jsonify({"message": "Signature not found"}), 404


@department.route('/department/<int:department_id>/signature', methods=['GET'])
def get_department_signature(department_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT signature_path FROM departments WHERE id = %s", (department_id,))
        row = cursor.fetchone()
        cursor.close()
        if not row:
            return jsonify({"message": "Department not found"}), 404

        signature_path = row.get("signature_path")
        return jsonify({
            "signature_path": signature_path,
            "signature_url": url_for(
                "department.serve_department_signature",
                filename=signature_path,
                _external=True,
            ) if signature_path else None,
        }), 200
    except Exception as e:
        print(f"[GET SIGNATURE ERROR] {e}")
        return jsonify({"message": "Error fetching signature"}), 500
    finally:
        if db:
            db.close()


@department.route('/department/<int:department_id>/signature', methods=['POST'])
def upload_department_signature(department_id):
    db = None
    try:
        if "signature" not in request.files:
            return jsonify({"message": "Signature file is required"}), 400

        file = request.files["signature"]
        if not file or not file.filename:
            return jsonify({"message": "Signature file is required"}), 400

        if not is_allowed_signature(file.filename):
            return jsonify({"message": "Use PNG, JPG, JPEG, or WEBP signature files only"}), 400

        os.makedirs(SIGNATURE_FOLDER, exist_ok=True)
        safe_name = secure_filename(file.filename)
        filename = f"department_{department_id}_{safe_name}"
        filepath = os.path.join(SIGNATURE_FOLDER, filename)
        file.save(filepath)

        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id FROM departments WHERE id = %s", (department_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"message": "Department not found"}), 404

        cursor.execute(
            "UPDATE departments SET signature_path = %s WHERE id = %s",
            (filename, department_id),
        )
        db.commit()
        cursor.close()

        return jsonify({
            "message": "Department signature uploaded successfully",
            "signature_path": filename,
            "signature_url": url_for(
                "department.serve_department_signature",
                filename=filename,
                _external=True,
            ),
        }), 200
    except Exception as e:
        print(f"[UPLOAD SIGNATURE ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": f"Error uploading signature: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Update workflow route status (for multi-department workflow)
@department.route('/department/workflow/<int:route_id>/status', methods=['PUT'])
def update_workflow_route_status(route_id):
    """
    Update the status of a specific department's workflow route.
    Valid statuses: Pending, In Review, Approved, Rejected
    """
    db = None
    try:
        data = request.json
        
        if not data.get('status'):
            return jsonify({"message": "Status is required"}), 400
        
        # Updated valid statuses for department workflow
        valid_statuses = ['Pending', 'In Review', 'Approved', 'Rejected']
        if data['status'] not in valid_statuses:
            return jsonify({"message": f"Invalid status. Use one of: {', '.join(valid_statuses)}"}), 400
        
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get current workflow route
        cursor.execute("""
            SELECT rwr.*, r.status as report_status, r.id as report_id
            FROM report_workflow_routes rwr
            JOIN reports r ON rwr.report_id = r.id
            WHERE rwr.id = %s
        """, (route_id,))
        
        route = cursor.fetchone()
        
        if not route:
            cursor.close()
            return jsonify({"message": "Workflow route not found"}), 404
        
        report_id = route['report_id']
        new_status = data['status']
        notes = data.get('notes', '')
        updated_by = data.get('updated_by', 1)
        
        # Update the workflow route status
        cursor.close()
        cursor = db.cursor(dictionary=True)
        
        if new_status == 'Approved':
            cursor.execute("""
                UPDATE report_workflow_routes
                SET status = 'Approved', approver_notes = %s, completed_date = NOW()
                WHERE id = %s
            """, (notes, route_id))
            
            # Log the approval
            cursor.execute("""
                INSERT INTO report_logs (report_id, new_department, updated_by, action, remarks)
                VALUES (%s, %s, %s, 'dept_approved', %s)
            """, (report_id, route['department_id'], updated_by, f"Department approved: {notes}"))
            
        elif new_status == 'Rejected':
            cursor.execute("""
                UPDATE report_workflow_routes
                SET status = 'Rejected', approver_notes = %s, completed_date = NOW()
                WHERE id = %s
            """, (notes, route_id))
            
            # Mark report as rejected
            cursor.execute("""
                UPDATE reports SET status = 'Rejected' WHERE id = %s
            """, (report_id,))
            
            # Log the rejection
            cursor.execute("""
                INSERT INTO report_logs (report_id, new_department, updated_by, action, remarks)
                VALUES (%s, %s, %s, 'dept_rejected', %s)
            """, (report_id, route['department_id'], updated_by, f"Department rejected: {notes}"))
            
        elif new_status == 'In Review':
            cursor.execute("""
                UPDATE report_workflow_routes
                SET status = 'In Review', approver_notes = %s
                WHERE id = %s
            """, (notes, route_id))
            
            # Log the review start
            cursor.execute("""
                INSERT INTO report_logs (report_id, new_department, updated_by, action, remarks)
                VALUES (%s, %s, %s, 'dept_in_review', %s)
            """, (report_id, route['department_id'], updated_by, f"Department started review: {notes}"))
            
        else:  # Pending
            cursor.execute("""
                UPDATE report_workflow_routes
                SET status = 'Pending', approver_notes = %s
                WHERE id = %s
            """, (notes, route_id))
        
        # Check if ALL departments have approved
        cursor.execute("""
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
            FROM report_workflow_routes
            WHERE report_id = %s
        """, (report_id,))
        
        stats = cursor.fetchone()
        
        # If all approved, mark report as Completed
        if stats['total'] == stats['approved']:
            cursor.execute("""
                UPDATE reports SET status = 'Completed', current_workflow_step = 5
                WHERE id = %s
            """, (report_id,))
            
            cursor.execute("""
                INSERT INTO report_logs (report_id, updated_by, action, remarks)
                VALUES (%s, %s, 'all_approved', 'All departments approved - Report completed')
            """, (report_id, updated_by))
        
        db.commit()
        cursor.close()
        
        return jsonify({
            "message": "Workflow status updated successfully",
            "status": new_status,
            "note": f"Department status: {new_status}"
        }), 200
        
    except Exception as e:
        print(f"[UPDATE WORKFLOW ROUTE STATUS ERROR] {e}")
        return jsonify({"message": f"Error updating status: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Update report status (Processing, Approved, Rejected, Completed) - Legacy support
@department.route('/department/report/<int:report_id>/status', methods=['PUT'])
def update_status(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('status'):
            return jsonify({"message": "Status is required"}), 400
        
        valid_statuses = ['Processing', 'Approved', 'Rejected', 'Completed']
        if data['status'] not in valid_statuses:
            return jsonify({"message": f"Invalid status. Use one of: {', '.join(valid_statuses)}"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        new_status = data['status']
        new_workflow_step = 4  # Default to Step 4: Processing
        
        # Step 4: Processing or Step 5: Completed
        if new_status == 'Processing':
            new_workflow_step = 4
        elif new_status == 'Completed':
            new_workflow_step = 5
        
        # Update report status and workflow step
        cursor.execute("""
            UPDATE reports
            SET status=%s, current_workflow_step=%s
            WHERE id=%s
        """, (new_status, new_workflow_step, report_id))
        
        # Log the change with step info
        remarks = data.get('remarks', f"Status changed to {new_status}")
        updated_by = data.get('updated_by', 1)
        
        if new_status == 'Processing':
            remarks = "Step 4: Department started processing the report"
        elif new_status == 'Completed':
            remarks = "Step 5: Department completed processing - awaiting Admin approval"
        
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, %s, %s, %s)
        """, (report_id, updated_by, new_status.lower(), remarks))
        
        db.commit()
        cursor.close()
        return jsonify({
            "message": "Report status updated successfully",
            "status": new_status,
            "workflow_step": new_workflow_step,
            "workflow_step_name": f"Step {new_workflow_step}: {'Processing' if new_status == 'Processing' else 'Completed'}",
            "note": "Completed reports require Admin approval"
        }), 200
    except Exception as e:
        print(f"[UPDATE STATUS ERROR] {e}")
        return jsonify({"message": f"Error updating status: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Add remarks/comments to report
@department.route('/department/report/<int:report_id>/remark', methods=['POST'])
def add_remark(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('remarks'):
            return jsonify({"message": "Remarks are required"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        updated_by = data.get('updated_by', 1)
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, remarks)
            VALUES (%s, %s, %s)
        """, (report_id, updated_by, data['remarks']))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Remark added successfully"}), 201
    except Exception as e:
        print(f"[ADD REMARK ERROR] {e}")
        return jsonify({"message": f"Error adding remark: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Reassign report to another department
@department.route('/department/report/<int:report_id>/reassign', methods=['PUT'])
def reassign_report(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('new_department_id'):
            return jsonify({"message": "new_department_id is required"}), 400
        
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get current department
        cursor.execute("SELECT department_id FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        old_dept = report['department_id']
        new_dept = data['new_department_id']
        
        cursor.close()
        cursor = db.cursor()
        
        # Update report
        cursor.execute("""
            UPDATE reports
            SET department_id=%s, status='Assigned'
            WHERE id=%s
        """, (new_dept, report_id))
        
        # Log the reassignment
        remarks = data.get('remarks', f"Reassigned from department {old_dept} to {new_dept}")
        updated_by = data.get('updated_by', 1)
        cursor.execute("""
            INSERT INTO report_logs (report_id, old_department, new_department, updated_by, remarks)
            VALUES (%s, %s, %s, %s, %s)
        """, (report_id, old_dept, new_dept, updated_by, remarks))
        
        db.commit()
        cursor.close()
        return jsonify({"message": "Report reassigned successfully"}), 200
    except Exception as e:
        print(f"[REASSIGN ERROR] {e}")
        return jsonify({"message": f"Error reassigning report: {str(e)}"}), 500
    finally:
        if db:
            db.close()
