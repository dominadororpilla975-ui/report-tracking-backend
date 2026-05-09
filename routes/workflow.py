import os
from flask import Blueprint, request, jsonify, url_for
from db import get_db
from datetime import datetime

workflow = Blueprint("workflow", __name__)

# =============== WORKFLOW MANAGEMENT ===============

# Get workflow routes for a report
@workflow.route('/workflow/report/<int:report_id>')
def get_report_workflow(report_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Get report details
        cursor.execute("""
            SELECT r.id, r.title, r.total_workflow_steps, r.current_workflow_step, r.status, r.attachment_path
            FROM reports r
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

        # Get workflow routes
        cursor.execute("""
            SELECT rwr.*, d.name as department_name, u.name as user_name
            FROM report_workflow_routes rwr
            LEFT JOIN departments d ON rwr.department_id = d.id
            LEFT JOIN users u ON rwr.assigned_user_id = u.id
            WHERE rwr.report_id = %s
            ORDER BY rwr.step_number
        """, (report_id,))
        workflow_steps = cursor.fetchall()

        cursor.close()
        return jsonify({
            "report": report,
            "workflow_steps": workflow_steps
        }), 200
    except Exception as e:
        print(f"[GET WORKFLOW ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Create workflow for a report (Multi-department routing)
@workflow.route('/workflow/create', methods=['POST'])
def create_workflow():
    db = None
    try:
        data = request.json

        if not data.get('report_id') or not data.get('departments'):
            return jsonify({"message": "report_id and departments array required"}), 400

        report_id = data['report_id']
        departments = data['departments']  # List of department IDs
        client_id = data.get('client_id', 1)

        if len(departments) == 0:
            return jsonify({"message": "At least one department required"}), 400

        db = get_db()
        cursor = db.cursor()

        # Update report with workflow info
        cursor.execute("""
            UPDATE reports
            SET total_workflow_steps = %s, current_workflow_step = 1, status = 'Assigned'
            WHERE id = %s
        """, (len(departments), report_id))

        # Create workflow routes for each department (in order)
        for step, dept_id in enumerate(departments, 1):
            cursor.execute("""
                INSERT INTO report_workflow_routes 
                (report_id, step_number, department_id, status)
                VALUES (%s, %s, %s, 'Pending')
            """, (report_id, step, dept_id))

            # Log the assignment
            cursor.execute("""
                INSERT INTO report_logs 
                (report_id, new_department, updated_by, action, remarks)
                VALUES (%s, %s, %s, 'workflow_created', %s)
            """, (report_id, dept_id, client_id, f"Added to workflow at step {step}"))

        db.commit()
        cursor.close()

        return jsonify({
            "message": "Workflow created successfully",
            "report_id": report_id,
            "steps": len(departments)
        }), 201
    except Exception as e:
        print(f"[CREATE WORKFLOW ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Approve current workflow step
@workflow.route('/workflow/approve/<int:report_id>', methods=['POST'])
def approve_workflow_step(report_id):
    db = None
    try:
        data = request.json
        approver_id = data.get('approver_id', 1)
        approver_notes = data.get('notes', 'Approved')

        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Determine approver department
        cursor.execute("""
            SELECT department_id FROM users WHERE id = %s
        """, (approver_id,))
        approver = cursor.fetchone()
        if not approver or not approver.get('department_id'):
            cursor.close()
            return jsonify({"message": "Approver must belong to a department to approve workflow steps."}), 400

        approver_department_id = approver['department_id']

        # Get the current workflow step for this department
        cursor.execute("""
            SELECT * FROM report_workflow_routes
            WHERE report_id = %s AND department_id = %s AND status IN ('Pending', 'In Progress')
            ORDER BY step_number LIMIT 1
        """, (report_id, approver_department_id))
        current_step = cursor.fetchone()

        if not current_step:
            cursor.close()
            return jsonify({"message": "No pending workflow step assigned to your department for this report."}), 404

        # Get report info
        cursor.execute("""
            SELECT * FROM reports WHERE id = %s
        """, (report_id,))
        report = cursor.fetchone()

        # Find the earliest remaining workflow step for progress tracking
        cursor.execute("""
            SELECT MIN(step_number) as earliest_pending
            FROM report_workflow_routes
            WHERE report_id = %s AND status IN ('Pending', 'In Progress')
        """, (report_id,))
        earliest_pending = cursor.fetchone()
        earliest_pending_step = earliest_pending['earliest_pending'] if earliest_pending else None

        cursor.close()
        cursor = db.cursor(dictionary=True)

        # Approve current department step
        cursor.execute("""
            UPDATE report_workflow_routes
            SET status = 'Approved', approver_notes = %s, completed_date = NOW()
            WHERE id = %s
        """, (approver_notes, current_step['id']))

        # Log the approval
        cursor.execute("""
            INSERT INTO report_logs 
            (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'approved', %s)
        """, (report_id, approver_id, f"Step {current_step['step_number']} approved: {approver_notes}"))

        # Check if there are any remaining workflow steps
        cursor.execute("""
            SELECT COUNT(*) as remaining
            FROM report_workflow_routes
            WHERE report_id = %s AND status IN ('Pending', 'In Progress')
        """, (report_id,))
        remaining_result = cursor.fetchone()
        remaining = 0
        if isinstance(remaining_result, dict):
            remaining = remaining_result.get('remaining', 0)
        elif isinstance(remaining_result, (list, tuple)):
            remaining = remaining_result[0] if len(remaining_result) > 0 else 0

        if remaining > 0:
            # If this was the earliest pending step, advance the next pending step to In Progress.
            if current_step['step_number'] == earliest_pending_step:
                cursor.execute("""
                    SELECT step_number, department_id
                    FROM report_workflow_routes
                    WHERE report_id = %s AND step_number > %s AND status = 'Pending'
                    ORDER BY step_number LIMIT 1
                """, (report_id, current_step['step_number']))
                next_route = cursor.fetchone()
                if next_route:
                    next_step_number = next_route['step_number']
                    next_department = next_route['department_id']
                    cursor.execute("""
                        UPDATE report_workflow_routes
                        SET status = 'In Progress'
                        WHERE report_id = %s AND step_number = %s
                    """, (report_id, next_step_number))
                    cursor.execute("""
                        UPDATE reports
                        SET current_workflow_step = %s, status = 'Processing', department_id = %s
                        WHERE id = %s
                    """, (next_step_number, next_department, report_id))
                else:
                    # Keep the report moving if there are still pending steps later.
                    cursor.execute("""
                        SELECT MIN(step_number) as next_step FROM report_workflow_routes
                        WHERE report_id = %s AND status IN ('Pending', 'In Progress')
                    """, (report_id,))
                    next_step_row = cursor.fetchone()
                    next_step_number = next_step_row['next_step'] if next_step_row else None
                    cursor.execute("""
                        SELECT department_id FROM report_workflow_routes
                        WHERE report_id = %s AND step_number = %s
                    """, (report_id, next_step_number))
                    next_department_row = cursor.fetchone()
                    next_department = next_department_row['department_id'] if next_department_row else None
                    cursor.execute("""
                        UPDATE reports
                        SET current_workflow_step = %s, status = 'Processing', department_id = %s
                        WHERE id = %s
                    """, (next_step_number, next_department, report_id))
            else:
                # Out-of-order approval: keep the report anchored to the earliest pending step.
                cursor.execute("""
                    SELECT department_id FROM report_workflow_routes
                    WHERE report_id = %s AND step_number = %s
                """, (report_id, earliest_pending_step))
                next_department_row = cursor.fetchone()
                next_department = next_department_row['department_id'] if next_department_row else None
                cursor.execute("""
                    UPDATE reports
                    SET current_workflow_step = %s, status = 'Processing', department_id = %s
                    WHERE id = %s
                """, (earliest_pending_step, next_department, report_id))
        else:
            # All workflow steps approved
            cursor.execute("""
                UPDATE reports
                SET status = 'Completed', current_workflow_step = %s
                WHERE id = %s
            """, (report['total_workflow_steps'], report_id))

            cursor.execute("""
                INSERT INTO report_logs 
                (report_id, updated_by, action, remarks)
                VALUES (%s, %s, 'completed', 'All workflow steps completed')
            """, (report_id, approver_id))

        db.commit()
        cursor.close()

        return jsonify({
            "message": "Step approved successfully",
            "approved_step": current_step['step_number']
        }), 200
    except Exception as e:
        print(f"[APPROVE WORKFLOW ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Reject current workflow step
@workflow.route('/workflow/reject/<int:report_id>', methods=['POST'])
def reject_workflow_step(report_id):
    db = None
    try:
        data = request.json
        approver_id = data.get('approver_id', 1)
        rejection_reason = data.get('reason', 'No reason provided')

        if not rejection_reason:
            return jsonify({"message": "Rejection reason required"}), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Determine approver department
        cursor.execute("""
            SELECT department_id FROM users WHERE id = %s
        """, (approver_id,))
        approver = cursor.fetchone()
        if not approver or not approver.get('department_id'):
            cursor.close()
            return jsonify({"message": "Approver must belong to a department to reject workflow steps."}), 400

        approver_department_id = approver['department_id']

        # Get current workflow step for this department
        cursor.execute("""
            SELECT * FROM report_workflow_routes
            WHERE report_id = %s AND department_id = %s AND status IN ('Pending', 'In Progress')
            ORDER BY step_number LIMIT 1
        """, (report_id, approver_department_id))
        current_step = cursor.fetchone()

        if not current_step:
            cursor.close()
            return jsonify({"message": "No pending workflow step assigned to your department for this report."}), 404

        cursor.close()
        cursor = db.cursor(dictionary=True)

        # Update current step
        cursor.execute("""
            UPDATE report_workflow_routes
            SET status = 'Rejected', approver_notes = %s, completed_date = NOW()
            WHERE id = %s
        """, (rejection_reason, current_step['id']))

        # Mark report as rejected
        cursor.execute("""
            UPDATE reports
            SET status = 'Rejected'
            WHERE id = %s
        """, (report_id,))

        # Log the rejection
        cursor.execute("""
            INSERT INTO report_logs 
            (report_id, updated_by, action, remarks)
            VALUES (%s, %s, 'rejected', %s)
        """, (report_id, approver_id, f"Step {current_step['step_number']} rejected: {rejection_reason}"))

        db.commit()
        cursor.close()

        return jsonify({
            "message": "Step rejected successfully",
            "reason": rejection_reason
        }), 200
    except Exception as e:
        print(f"[REJECT WORKFLOW ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Get pending reports for a department
@workflow.route('/workflow/department/<int:department_id>/pending')
def get_pending_for_department(department_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT DISTINCT r.id, r.title, r.description, r.status, 
                   rwr.step_number, rwr.id as route_id,
                   c.name as client_name, d.name as department_name,
                   r.created_at
            FROM reports r
            JOIN report_workflow_routes rwr ON r.id = rwr.report_id
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN departments d ON rwr.department_id = d.id
            WHERE rwr.department_id = %s AND rwr.status IN ('Pending', 'In Progress')
            ORDER BY rwr.step_number, r.created_at DESC
        """, (department_id,))

        reports = cursor.fetchall()
        cursor.close()

        return jsonify(reports), 200
    except Exception as e:
        print(f"[GET PENDING ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Get processing reports for a department (In Progress)
@workflow.route('/workflow/department/<int:department_id>/processing')
def get_processing_for_department(department_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT DISTINCT r.id, r.title, r.description, r.status,
                   rwr.step_number, rwr.status as route_status,
                   c.name as client_name, d.name as department_name,
                   r.created_at
            FROM reports r
            JOIN report_workflow_routes rwr ON r.id = rwr.report_id
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN departments d ON rwr.department_id = d.id
            WHERE rwr.department_id = %s AND rwr.status = 'In Progress'
            ORDER BY r.created_at DESC
        """, (department_id,))

        reports = cursor.fetchall()
        cursor.close()

        return jsonify(reports), 200
    except Exception as e:
        print(f"[GET PROCESSING ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Get completed reports for a department
@workflow.route('/workflow/department/<int:department_id>/completed')
def get_completed_for_department(department_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT DISTINCT r.id, r.title, r.status,
                   rwr.step_number, rwr.approver_notes,
                   c.name as client_name, d.name as department_name,
                   r.created_at, rwr.completed_date
            FROM reports r
            JOIN report_workflow_routes rwr ON r.id = rwr.report_id
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN departments d ON rwr.department_id = d.id
            WHERE rwr.department_id = %s AND rwr.status IN ('Approved', 'Rejected')
            ORDER BY rwr.completed_date DESC
        """, (department_id,))

        reports = cursor.fetchall()
        cursor.close()

        return jsonify(reports), 200
    except Exception as e:
        print(f"[GET COMPLETED ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Reassign workflow step to a different staff member
@workflow.route('/workflow/reassign/<int:route_id>', methods=['PUT'])
def reassign_workflow_step(route_id):
    db = None
    try:
        data = request.json
        new_user_id = data.get('assigned_user_id')
        reassigned_by = data.get('reassigned_by', 1)

        if not new_user_id:
            return jsonify({"message": "assigned_user_id required"}), 400

        db = get_db()
        cursor = db.cursor()

        cursor.execute("""
            UPDATE report_workflow_routes
            SET assigned_user_id = %s
            WHERE id = %s
        """, (new_user_id, route_id))

        db.commit()
        cursor.close()

        return jsonify({"message": "Workflow step reassigned"}), 200
    except Exception as e:
        print(f"[REASSIGN ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Reassign report to different department (for workflow)
@workflow.route('/workflow/reassign-department/<int:report_id>', methods=['PUT'])
def reassign_report_department(report_id):
    db = None
    try:
        data = request.json
        new_department_id = data.get('new_department_id')
        updated_by = data.get('updated_by', 1)
        reason = data.get('reason', 'Reassigned by admin')
        return_to_admin = data.get('return_to_admin', False)

        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get current report
        cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            return jsonify({"message": "Report not found"}), 404
        
        old_dept = report.get('department_id')
        old_dept_name = None
        
        # Get old department name
        if old_dept:
            cursor.execute("SELECT name FROM departments WHERE id = %s", (old_dept,))
            old_dept_result = cursor.fetchone()
            if old_dept_result:
                old_dept_name = old_dept_result['name']
        
        # Get new department name
        new_dept_name = None
        if new_department_id:
            cursor.execute("SELECT name FROM departments WHERE id = %s", (new_department_id,))
            new_dept_result = cursor.fetchone()
            if new_dept_result:
                new_dept_name = new_dept_result['name']
        
        cursor.close()
        cursor = db.cursor()
        
        if return_to_admin:
            # Return to admin - set department to null
            new_department_id = None
            
            # Log the return to admin
            cursor.execute("""
                INSERT INTO report_logs (report_id, old_department, new_department, updated_by, action, remarks)
                VALUES (%s, %s, %s, %s, 'returned_to_admin', %s)
            """, (report_id, old_dept, None, updated_by, f"Returned to Admin for reassignment: {reason}"))
            
            # Update report status to Pending for admin review
            cursor.execute("""
                UPDATE reports
                SET department_id = NULL, status = 'Pending'
                WHERE id = %s
            """, (report_id,))
            
            action = "returned_to_admin"
            remarks = f"Returned to Admin: {reason}"
        else:
            # Regular reassignment to new department
            if old_dept_name and new_dept_name:
                remarks = f"Reassigned from {old_dept_name} to {new_dept_name}: {reason}"
            elif new_dept_name:
                remarks = f"Assigned to {new_dept_name}: {reason}"
            else:
                remarks = f"Reassigned: {reason}"
            
            # Log the reassignment
            cursor.execute("""
                INSERT INTO report_logs (report_id, old_department, new_department, updated_by, action, remarks)
                VALUES (%s, %s, %s, %s, 'reassigned', %s)
            """, (report_id, old_dept, new_department_id, updated_by, remarks))
            
            # Update report department
            cursor.execute("""
                UPDATE reports
                SET department_id = %s, status = 'Assigned'
                WHERE id = %s
            """, (new_department_id, report_id))
            
            action = "reassigned"
        
        db.commit()
        cursor.close()
        
        return jsonify({
            "message": f"Report {action} successfully",
            "action": action,
            "old_department": old_dept_name,
            "new_department": new_dept_name if new_department_id else "Admin"
        }), 200
    except Exception as e:
        print(f"[REASSIGN DEPT ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# Get workflow with reassignment history
@workflow.route('/workflow/<int:report_id>/history')
def get_workflow_history(report_id):
    """Get detailed workflow history including reassignments"""
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Get all logs for this report (for timeline)
        cursor.execute("""
            SELECT rl.*, 
                   u.name as updated_by_name,
                   od.name as old_department_name,
                   nd.name as new_department_name
            FROM report_logs rl
            LEFT JOIN users u ON rl.updated_by = u.id
            LEFT JOIN departments od ON rl.old_department = od.id
            LEFT JOIN departments nd ON rl.new_department = nd.id
            WHERE rl.report_id = %s
            ORDER BY rl.date_updated ASC
        """, (report_id,))
        
        logs = cursor.fetchall()

        # Get report details
        cursor.execute("""
            SELECT r.*, d.name as department_name, c.name as client_name
            FROM reports r
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN users c ON r.client_id = c.id
            WHERE r.id = %s
        """, (report_id,))
        report = cursor.fetchone()

        # Get workflow routes (departments in workflow)
        cursor.execute("""
            SELECT rwr.*, d.name as department_name, d.signature_path
            FROM report_workflow_routes rwr
            LEFT JOIN departments d ON rwr.department_id = d.id
            WHERE rwr.report_id = %s
            ORDER BY rwr.step_number
        """, (report_id,))
        workflow_steps = cursor.fetchall()

        cursor.close()

        # Process logs to add human-readable descriptions
        for log in logs:
            log['display_action'] = get_log_display_action(log)

        for step in workflow_steps:
            if step.get('signature_path'):
                step['signature_url'] = url_for(
                    'department.serve_department_signature',
                    filename=step['signature_path'],
                    _external=True,
                )

        return jsonify({
            "report": report,
            "logs": logs,
            "workflow_steps": workflow_steps
        }), 200
    except Exception as e:
        print(f"[GET WORKFLOW HISTORY ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()

def get_log_display_action(log):
    """Convert log action to user-friendly display"""
    action = log.get('action', '')
    old_dept = log.get('old_department_name')
    new_dept = log.get('new_department_name')
    remarks = log.get('remarks', '')
    
    action_mapping = {
        'submitted': '📝 Paper Submitted',
        'step1_submitted': '📝 Paper Submitted - Waiting for Admin Review',
        'step2_reviewed': '👀 Admin Reviewed the Paper',
        'step3_assigned': f'📋 Assigned to {new_dept or "Department"}',
        'assigned': f'📋 Assigned to {new_dept or "Department"}',
        'dept_in_review': f'🔍 {new_dept or "Department"} - In Review',
        'dept_approved': f'✅ {new_dept or "Department"} - Approved',
        'dept_rejected': f'❌ {new_dept or "Department"} - Rejected',
        'returned_to_admin': '↩️ Returned to Admin for Reassignment',
        'reassigned': f'🔄 Reassigned to {new_dept or "Department"}',
        'approved': '✅ Report Approved',
        'rejected': '❌ Report Rejected',
        'completed': '🏁 Processing Completed',
        'all_approved': '🎉 All Departments Approved',
        'processing': f'⚙️ Processing at {new_dept or "Department"}',
        'workflow_created': f'📋 Workflow Created - {new_dept or "Department"} added',
    }
    
    if action in action_mapping:
        return action_mapping[action]
    
    # If no mapping, return the remarks or action
    return remarks if remarks else action

# Get department-specific stats
@workflow.route('/workflow/department/<int:department_id>/stats')
def get_department_workflow_stats(department_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get pending count
        cursor.execute("""
            SELECT COUNT(*) as count FROM report_workflow_routes
            WHERE department_id = %s AND status IN ('Pending', 'In Progress')
        """, (department_id,))
        pending = cursor.fetchone()
        
        # Get processing count
        cursor.execute("""
            SELECT COUNT(*) as count FROM report_workflow_routes
            WHERE department_id = %s AND status = 'In Progress'
        """, (department_id,))
        processing = cursor.fetchone()
        
        # Get completed count
        cursor.execute("""
            SELECT COUNT(*) as count FROM report_workflow_routes
            WHERE department_id = %s AND status = 'Approved'
        """, (department_id,))
        completed = cursor.fetchone()
        
        cursor.close()
        
        return jsonify({
            "pending": pending['count'] if pending else 0,
            "processing": processing['count'] if processing else 0,
            "completed": completed['count'] if completed else 0
        }), 200
    except Exception as e:
        print(f"[DEPT STATS ERROR] {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        if db:
            db.close()
