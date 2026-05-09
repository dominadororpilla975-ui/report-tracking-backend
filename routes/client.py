from flask import Blueprint, jsonify, request, send_from_directory, url_for
from werkzeug.exceptions import NotFound
from werkzeug.utils import secure_filename
from db import get_db
import os

client = Blueprint("client", __name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

# Get client reports with status
@client.route('/client/reports/<user>')
def my_reports(user):
    db = None
    try:
        status = request.args.get('status')  # Filter by status
        
        # determine identifier type
        user_id = None
        if user.isdigit():
            user_id = int(user)
        else:
            db = get_db()
            cursor = db.cursor()
            cursor.execute("SELECT id FROM users WHERE email=%s", (user,))
            row = cursor.fetchone()
            cursor.close()
            if row:
                user_id = row[0]
            else:
                return jsonify({"message": "User not found"}), 404

        if not db:
            db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get reports with department info for client tracking
        # Build query with filters
        where_conditions = ["r.client_id=%s"]
        params = [user_id]
        
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
            SELECT r.*, d.name as department_name 
            FROM reports r 
            LEFT JOIN departments d ON r.department_id = d.id 
            WHERE {where_clause}
            {order_by}
        """
        cursor.execute(query, params)
        
        reports = cursor.fetchall()
        
        # Enhance reports with user-friendly status display
        for report in reports:
            # Add friendly status message
            report['status_display'] = get_status_display(report.get('status'), report.get('department_name'))
            # Add workflow step info
            report['workflow_step_display'] = get_workflow_step_display(report.get('current_workflow_step', 1))
        
        cursor.close()
        return jsonify(reports), 200
    except Exception as e:
        print(f"[CLIENT REPORTS ERROR] {e}")
        return jsonify({"message": "Error fetching reports"}), 500
    finally:
        if db:
            db.close()

def get_status_display(status, department_name):
    """Convert status to user-friendly display message"""
    status_mapping = {
        'Pending': f'Submitted - Waiting for Admin Review',
        'Assigned': f'Assigned to {department_name}' if department_name else 'Assigned to Department',
        'Processing': f'Processing at {department_name}' if department_name else 'Being Processed',
        'Completed': f'Completed at {department_name} - Pending Approval' if department_name else 'Completed - Pending Approval',
        'Approved': f'Approved by {department_name}' if department_name else 'Approved',
        'Rejected': 'Rejected'
    }
    return status_mapping.get(status, status)

def get_workflow_step_display(step):
    """Get workflow step description"""
    step_mapping = {
        1: 'Step 1: Report Submitted',
        2: 'Step 2: Under Admin Review',
        3: 'Step 3: Assigned to Department',
        4: 'Step 4: Being Processed',
        5: 'Step 5: Processing Complete',
        6: 'Step 6: Fully Approved'
    }
    return step_mapping.get(step, f'Step {step}')

# Get single report with history
@client.route('/client/report/<int:report_id>')
def get_report_detail(report_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT r.*, d.name as department_name 
            FROM reports r 
            LEFT JOIN departments d ON r.department_id = d.id 
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

        # Add user-friendly status display
        report['status_display'] = get_status_display(report.get('status'), report.get('department_name'))
        report['workflow_step_display'] = get_workflow_step_display(report.get('current_workflow_step', 1))
        
        # Get logs/history with department names
        cursor.execute("""
            SELECT rl.*, u.name as updated_by_name, d.name as department_name
            FROM report_logs rl 
            LEFT JOIN users u ON rl.updated_by = u.id 
            LEFT JOIN departments d ON rl.new_department = d.id 
            WHERE rl.report_id = %s 
            ORDER BY rl.date_updated DESC
        """, (report_id,))
        
        logs = cursor.fetchall()
        
        # Add human-readable action descriptions to logs
        for log in logs:
            log['action_display'] = get_action_display(log.get('action'), log.get('department_name'))
        
        cursor.close()
        
        return jsonify({
            "report": report, 
            "updates": logs,
            "tracking_info": {
                "current_status": report['status_display'],
                "current_step": report['workflow_step_display'],
                "handling_department": report.get('department_name', 'Awaiting Assignment'),
                "timeline_count": len(logs)
            }
        }), 200
    except Exception as e:
        print(f"[REPORT DETAIL ERROR] {e}")
        return jsonify({"message": "Error fetching report"}), 500
    finally:
        if db:
            db.close()

def get_action_display(action, department_name):
    """Convert action to user-friendly display"""
    action_mapping = {
        'submitted': 'Report submitted',
        'step1_submitted': 'Report submitted - Waiting for Admin Review',
        'step2_reviewed': 'Admin reviewed the report',
        'step3_assigned': f'Assigned to {department_name}' if department_name else 'Assigned to Department',
        'step4_processing': f'Processing at {department_name}' if department_name else 'Processing started',
        'step5_completed': f'Completed at {department_name}' if department_name else 'Processing completed',
        'step6_approved': 'Fully approved',
        'assigned': f'Assigned to {department_name}' if department_name else 'Assigned',
        'processing': f'Processing at {department_name}' if department_name else 'Being processed',
        'completed': 'Processing completed',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'reassigned': 'Reassigned to different department'
    }
    return action_mapping.get(action, action)

# Submit new report
@client.route('/client/report', methods=['POST'])
def submit_report():
    db = None
    try:
        attachment_path = None
        
        # Handle both JSON and FormData
        if request.is_json:
            data = request.json
        else:
            data = request.form.to_dict()
        
        # Validate required fields
        # Handle client creation from email
        client_id = data.get('client_id')
        client_email = data.get('client_email')
        client_name = data.get('client_name', '')
        
        report_client_email = client_email
        report_client_name = client_name

        if client_email:
            from client_utils import create_client_account
            client_id, temp_pass = create_client_account(client_email, client_name)
            print(f"Used client_id {client_id} for report (new account: {temp_pass is not None})")
            report_client_email = client_email
            report_client_name = client_name
        elif not client_id:
            return jsonify({"message": "Either client_id or client_email is required"}), 400

        if client_id and not report_client_email:
            db_lookup = get_db()
            cursor_lookup = db_lookup.cursor(dictionary=True)
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
        if len(data['title'].strip()) < 3:
            return jsonify({"message": "Title must be at least 3 characters"}), 400
        
        if len(data['description'].strip()) < 10:
            return jsonify({"message": "Description must be at least 10 characters"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Define workflow steps:
        # Step 1: Report Submitted
        # Step 2: Admin Review
        # Step 3: Department Assigned
        # Step 4: Processing
        # Step 5: Completed
        # Step 6: Approved
        
        total_steps = 6
        current_step = 1  # Step 1: Report Submitted
        
        # Insert report FIRST to get ID for filename
        cursor.execute("""
            INSERT INTO reports (title, description, client_id, status, budget, department_id, 
                              current_workflow_step, total_workflow_steps, client_email, client_name)
            VALUES (%s, %s, %s, 'Pending', %s, NULL, %s, %s, %s, %s)
        """, (data['title'], data['description'], client_id, data.get('budget', 0), current_step, total_steps, report_client_email, report_client_name))
        
        report_id = cursor.lastrowid
        
        # Create uploads dir if not exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Now handle files with report_id
        attachment_path = None
        if 'attachments' in request.files and not request.is_json:
            files = request.files.getlist('attachments')
            for i, file in enumerate(files):
                if file and file.filename:
                    safe_name = secure_filename(file.filename)
                    filename = f"report_{report_id}_{i+1}_{safe_name}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    if not attachment_path:
                        attachment_path = filename  # Store only the filename
            
            # Update report with attachment_path
            cursor.execute("""
                UPDATE reports SET attachment_path = %s WHERE id = %s
            """, (attachment_path, report_id))

        
        # Log initial submission - Step 1: Report Submitted
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'step1_submitted', 'Step 1: Report Submitted - Pending Admin Review')
        """, (report_id, client_id))

        # IMPORTANT: Department assignment is handled ONLY by Admin after review
        # This ensures all reports go through Admin first before being assigned
        
        db.commit()
        cursor.close()
        
        return jsonify({
            "message": "Report submitted successfully. Pending Admin review.",
            "report_id": report_id,
            "status": "Pending",
            "workflow_step": 1,
            "workflow_step_name": "Step 1: Report Submitted",
            "total_steps": 6
        }), 201
    except Exception as e:
        print(f"[SUBMIT REPORT ERROR] {e}")
        return jsonify({"message": f"Error submitting report: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Serve uploaded attachment files
@client.route('/client/attachment/<path:filename>')
def serve_attachment(filename):
    try:
        return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
    except NotFound:
        return jsonify({"message": "Attachment not found"}), 404
    except Exception as e:
        print(f"[ATTACHMENT SERVE ERROR] {e}")
        return jsonify({"message": "Unable to serve attachment"}), 500

# Add comment/feedback to report by client
@client.route('/client/report/<int:report_id>/feedback', methods=['POST'])
def add_feedback(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('feedback'):
            return jsonify({"message": "Feedback is required"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Verify report belongs to this client
        cursor.execute("SELECT client_id FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        # Add feedback as a log entry
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, remarks)
            VALUES (%s, %s, %s)
        """, (report_id, report[0], f"Client feedback: {data['feedback']}"))
        
        db.commit()
        cursor.close()
        
        return jsonify({"message": "Feedback added successfully"}), 201
    except Exception as e:
        print(f"[ADD FEEDBACK ERROR] {e}")
        return jsonify({"message": f"Error adding feedback: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Client request reassignment (for budget-related reports)
@client.route('/client/report/<int:report_id>/request-reassign', methods=['POST'])
def request_reassign(report_id):
    db = None
    try:
        data = request.json
        
        if not data.get('reason'):
            return jsonify({"message": "Reason for reassignment is required"}), 400
        
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get current report
        cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        # Log the reassignment request
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'reassign_requested', %s)
        """, (report_id, report['client_id'], f"Reassignment requested: {data['reason']}"))
        
        # Update reassign_reason field
        cursor.execute("""
            UPDATE reports
            SET reassign_reason = %s
            WHERE id = %s
        """, (data['reason'], report_id))
        
        db.commit()
        cursor.close()
        
        return jsonify({"message": "Reassignment request submitted"}), 201
    except Exception as e:
        print(f"[REQUEST REASSIGN ERROR] {e}")
        return jsonify({"message": f"Error requesting reassignment: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Client get dashboard stats
@client.route('/client/stats/<int:user_id>')
def get_client_stats(user_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Status distribution for this client
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM reports 
            WHERE client_id = %s
            GROUP BY status
        """, (user_id,))
        status_counts = cursor.fetchall()
        
        # Recent activity
        cursor.execute("""
            SELECT r.id, r.title, r.status, r.created_at
            FROM reports r
            WHERE r.client_id = %s
            ORDER BY r.created_at DESC
            LIMIT 5
        """, (user_id,))
        recent_reports = cursor.fetchall()
        
        cursor.close()
        
        return jsonify({
            "status_counts": status_counts,
            "recent_reports": recent_reports
        }), 200
    except Exception as e:
        print(f"[CLIENT STATS ERROR] {e}")
        return jsonify({"message": f"Error fetching stats: {str(e)}"}), 500
    finally:
        if db:
            db.close()

@client.route('/client/report/notify/<int:report_id>', methods=['POST'])
def notify_client(report_id):
    """Send simple client report notification email"""
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT r.*, u.email as client_email, u.name as client_name, d.name as department_name
            FROM reports r 
            LEFT JOIN users u ON r.client_id = u.id
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE r.id = %s
        """, (report_id,))
        report = cursor.fetchone()

        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404

        if report['sent_to_client']:
            cursor.close()
            return jsonify({"message": "Client already notified"}), 400

        cursor.close()

        subject = f"Report Update: {report['title']} (ID #{report['id']})"
        from config import build_frontend_url
        client_dashboard_url = build_frontend_url("client-dashboard")
        html_content = f"""
        <p>Hello {report['client_name'] or report['client_email']},</p>
        <p>Your report <strong>{report['title']}</strong> has been updated.</p>
        <p><strong>Status:</strong> {report['status']}</p>
        <p><strong>Department:</strong> {report['department_name'] or 'Not assigned yet'}</p>
        <p>Please login to view the full details:</p>
        <p><a href="{client_dashboard_url}">Report Tracking System</a></p>
        <p>Thank you,<br/>Report Tracking System</p>
        """
        text_content = (
            f"Hello {report['client_name'] or report['client_email']},\n\n"
            f"Your report '{report['title']}' has been updated.\n"
            f"Status: {report['status']}\n"
            f"Department: {report['department_name'] or 'Not assigned yet'}\n\n"
            f"Please login to view the full details: {client_dashboard_url}\n\n"
            "Thank you,\nReport Tracking System"
        )

        from email_service import send_generic_email
        send_generic_email(
            report['client_email'],
            subject,
            html_content,
            text_content,
            report.get('client_name') or report['client_email'],
        )

        cursor = db.cursor()
        cursor.execute("""
            UPDATE reports 
            SET sent_to_client = 1, client_notified_at = NOW()
            WHERE id = %s
        """, (report_id,))
        cursor.execute("""
            INSERT INTO report_logs (report_id, updated_by, action, remarks)
            VALUES (%s, 1, 'client_notified', 'Notification email sent to client')
        """, (report_id,))
        db.commit()
        cursor.close()

        return jsonify({
            "message": "Client notified successfully by email",
            "client_email": report['client_email'],
            "report_id": report_id
        }), 200

    except Exception as e:
        print(f"[NOTIFY CLIENT ERROR] {e}")
        return jsonify({"message": f"Error sending notification: {str(e)}"}), 500
    finally:
        if db:
            db.close()

