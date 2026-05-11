import React, { useState, useEffect } from "react";
import "../styles/WorkflowTracker.css";

const PaperTracker = ({ reportId, role = "client", view = "full" }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        // Fetch both report details and workflow with history
        const apiUrl =
          process.env.REACT_APP_API_URL ||
          "https://report-tracking-backend-4.onrender.com";
        const [reportRes, historyRes] = await Promise.all([
          fetch(`${apiUrl}/client/report/${reportId}`),
          fetch(`${apiUrl}/workflow/${reportId}/history`),
        ]);

        if (reportRes.ok && historyRes.ok) {
          const reportData = await reportRes.json();
          const historyData = await historyRes.json();

          setTrackingData({
            report: reportData.report,
            updates: reportData.updates,
            logs: historyData.logs,
            workflow_steps: historyData.workflow_steps,
            tracking_info: reportData.tracking_info,
          });
          setError("");
        }
      } catch (err) {
        setError("Failed to load tracking information");
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 10000);
    return () => clearInterval(interval);
  }, [reportId]);

  if (loading)
    return (
      <div className="paper-tracker-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading record tracking...</p>
      </div>
    );

  if (error)
    return (
      <div className="paper-tracker-error alert alert-danger">{error}</div>
    );

  if (!trackingData) return null;

  const { report, workflow_steps, logs } = trackingData;

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      Pending: "#ffc107", // Yellow
      "In Progress": "#17a2b8", // Blue
      "In Review": "#6f42c1", // Purple
      Approved: "#28a745", // Green
      Rejected: "#dc3545", // Red
      Completed: "#20c997", // Teal
    };
    return colors[status] || "#6c757d";
  };

  // Get status icon
  const getStatusIcon = (status) => {
    const icons = {
      Pending: "⏳",
      "In Progress": "🔄",
      "In Review": "👁️",
      Approved: "✅",
      Rejected: "❌",
      Completed: "🏁",
    };
    return icons[status] || "📄";
  };

  // Get overall status message
  const getOverallStatusMessage = () => {
    if (report.status === "Rejected") {
      return { message: "Record Rejected", color: "#dc3545", icon: "❌" };
    }
    if (report.status === "Approved") {
      return { message: "Record Fully Approved", color: "#28a745", icon: "🎉" };
    }
    if (report.status === "Completed") {
      return {
        message: "Processing Complete - Awaiting Final Approval",
        color: "#20c997",
        icon: "⏳",
      };
    }
    if (report.status === "Processing") {
      return {
        message: "Currently Being Processed",
        color: "#17a2b8",
        icon: "🔄",
      };
    }
    if (report.status === "Assigned") {
      return {
        message: "Assigned to Department(s)",
        color: "#6f42c1",
        icon: "📤",
      };
    }
    return { message: "Awaiting Admin Review", color: "#ffc107", icon: "📝" };
  };

  const overallStatus = getOverallStatusMessage();

  // Check if report is currently with admin (returned to admin)
  const isWithAdmin =
    report.status === "Pending" && report.department_id === null;

  const renderDepartmentProgress = () => {
    if (!workflow_steps || workflow_steps.length === 0) {
      return (
        <div className="department-progress">
          <h5 className="section-title">Department Status</h5>
          <p className="section-subtitle">
            No department route has been assigned yet.
          </p>
        </div>
      );
    }

    return (
      <div className="department-progress">
        <h5 className="section-title">Department Status</h5>
        <p className="section-subtitle">
          Track each department's progress below
        </p>

        {workflow_steps.map((dept, index) => (
          <div
            key={dept.id}
            className={`dept-card ${dept.status.toLowerCase().replace(" ", "-")}`}
            style={{ borderLeftColor: getStatusColor(dept.status) }}
          >
            <div className="dept-header">
              <div className="dept-order">#{index + 1}</div>
              <div className="dept-name">{dept.department_name}</div>
              <div
                className="dept-status"
                style={{ backgroundColor: getStatusColor(dept.status) }}
              >
                {getStatusIcon(dept.status)} {dept.status}
              </div>
            </div>

            <div className="dept-details">
              {dept.status === "Pending" && (
                <p className="dept-message">Waiting for review</p>
              )}
              {dept.status === "In Progress" && (
                <p className="dept-message">Currently under review</p>
              )}
              {dept.status === "Under Review" && (
                <p className="dept-message">Being reviewed by department</p>
              )}
              {dept.status === "Approved" && (
                <p className="dept-message">Approved</p>
              )}
              {dept.status === "Rejected" && (
                <p className="dept-message">Rejected: {dept.approver_notes}</p>
              )}
              {dept.status === "Completed" && (
                <p className="dept-message">Processing completed</p>
              )}

              {dept.assigned_date && (
                <p className="dept-date">
                  Assigned: {new Date(dept.assigned_date).toLocaleDateString()}
                </p>
              )}
              {dept.completed_date && (
                <p className="dept-date">
                  Completed:{" "}
                  {new Date(dept.completed_date).toLocaleDateString()}
                </p>
              )}
              {dept.user_name && (
                <p className="dept-assignee">Assigned to: {dept.user_name}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (view === "department-status") {
    return <div className="paper-tracker">{renderDepartmentProgress()}</div>;
  }

  return (
    <div className="paper-tracker">
      {/* Header - Shopee Style Status */}
      <div
        className="tracker-header"
        style={{ backgroundColor: overallStatus.color }}
      >
        <div className="tracker-icon">{overallStatus.icon}</div>
        <div className="tracker-status">
          <h4>{overallStatus.message}</h4>
          <p>
            Record ID: #{report.id} • {report.title}
          </p>
        </div>
      </div>

      {report.attachment_url && (
        <div className="tracker-attachment alert alert-secondary mt-3">
          <strong>Attachment:</strong>{" "}
          <a
            href={report.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download file
          </a>
        </div>
      )}

      {/* Progress Bar */}
      <div className="tracker-progress">
        <div className="progress-labels">
          <span>Submitted</span>
          <span>Review</span>
          <span>Processing</span>
          <span>Complete</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${(report.current_workflow_step / report.total_workflow_steps) * 100}%`,
              backgroundColor:
                report.status === "Rejected" ? "#dc3545" : overallStatus.color,
            }}
          />
        </div>
      </div>

      {/* Main Timeline - Shopee Style */}
      <div className="tracker-timeline">
        <h5 className="timeline-title">📍 Tracking Timeline</h5>

        {/* Step 1: Submitted */}
        <div className="timeline-step completed">
          <div className="step-marker">✅</div>
          <div className="step-details">
            <h6>Record Submitted</h6>
            <span className="step-status-badge completed">Submitted</span>
          </div>
        </div>

        {/* Show logs/events timeline */}
        {logs && logs.length > 0 && (
          <div className="events-timeline">
            {logs.map((log, index) => (
              <div
                key={log.id || index}
                className={`timeline-event ${
                  log.action === "returned_to_admin"
                    ? "event-admin"
                    : log.action === "reassigned"
                      ? "event-reassign"
                      : log.action === "dept_approved"
                        ? "event-approved"
                        : log.action === "dept_rejected"
                          ? "event-rejected"
                          : ""
                }`}
              >
                {/* Return to Admin Event */}
                {log.action === "returned_to_admin" && (
                  <div className="timeline-step completed">
                    <div className="step-marker">↩️</div>
                    <div className="step-details">
                      <h6>Returned to Admin for Reassignment</h6>
                      <p className="step-time">
                        {new Date(log.date_updated).toLocaleString()}
                      </p>
                      <span className="step-status-badge pending">
                        {log.remarks || "Awaiting reassignment"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Reassignment Event */}
                {log.action === "reassigned" && (
                  <div className="timeline-step active">
                    <div className="step-marker">🔄</div>
                    <div className="step-details">
                      <h6>Reassigned to New Department</h6>
                      <p className="step-time">
                        {new Date(log.date_updated).toLocaleString()}
                      </p>
                      <span className="step-status-badge processing">
                        {log.new_department_name || "New Department"}
                      </span>
                      {log.remarks && (
                        <p className="step-notes">{log.remarks}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Department Approved Event */}
                {log.action === "dept_approved" &&
                  index === logs.length - 1 &&
                  !log.action.includes("returned") && (
                    <div className="timeline-step completed">
                      <div className="step-marker">✅</div>
                      <div className="step-details">
                        <h6>Department Approved</h6>
                        <p className="step-time">
                          {new Date(log.date_updated).toLocaleString()}
                        </p>
                        <span className="step-status-badge completed">
                          {log.new_department_name || "Department"}
                        </span>
                        {log.remarks && (
                          <p className="step-notes">{log.remarks}</p>
                        )}
                      </div>
                    </div>
                  )}

                {/* Department Rejected Event */}
                {log.action === "dept_rejected" && (
                  <div className="timeline-step rejected">
                    <div className="step-marker">❌</div>
                    <div className="step-details">
                      <h6>Department Rejected</h6>
                      <p className="step-time">
                        {new Date(log.date_updated).toLocaleString()}
                      </p>
                      <span className="step-status-badge rejected">
                        {log.new_department_name || "Department"}
                      </span>
                      {log.remarks && (
                        <p className="step-notes">{log.remarks}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current status: Returned to Admin */}
        {isWithAdmin && (
          <div className="timeline-step active">
            <div className="step-marker">↩️</div>
            <div className="step-details">
              <h6>Returned to Admin</h6>
              <p className="step-time">Currently with Admin for reassignment</p>
              <span className="step-status-badge pending">
                Awaiting Admin Decision
              </span>
            </div>
          </div>
        )}

        {/* Conversation Panel */}
        {logs && logs.length > 0 && (
          <div className="conversation-panel">
            <h5 className="section-title">💬 Conversation</h5>
            <p className="section-subtitle">
              Admin messages and updates related to this record.
            </p>
            {logs
              .filter(
                (log) =>
                  log.action === "admin_comment" ||
                  log.remarks?.startsWith("Client feedback:") ||
                  log.action === "remark" ||
                  log.action === "returned_to_admin" ||
                  log.action === "reassign_requested",
              )
              .sort(
                (a, b) =>
                  new Date(a.date_updated || a.created_at) -
                  new Date(b.date_updated || b.created_at),
              )
              .map((log) => {
                const isAdmin = log.action === "admin_comment";
                const isClient = log.remarks?.startsWith("Client feedback:");
                const sender = isAdmin
                  ? "Admin"
                  : isClient
                    ? "Client"
                    : "Department";
                const bubbleClass = isAdmin
                  ? "message-admin"
                  : isClient
                    ? "message-client"
                    : "message-department";
                const text = isClient
                  ? log.remarks.replace("Client feedback:", "").trim()
                  : log.remarks || log.action_display || "Update";
                return (
                  <div
                    key={log.id || `${log.action}-${log.date_updated}`}
                    className={`message-bubble ${bubbleClass}`}
                  >
                    <div className="message-sender">{sender}</div>
                    <div className="message-text">{text}</div>
                    <div className="message-time">
                      {new Date(
                        log.date_updated || log.created_at,
                      ).toLocaleString()}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Department Progress - Shopee Style Cards */}
        {workflow_steps && workflow_steps.length > 0 && (
          <div className="department-progress">
            <h5 className="section-title">🏢 Department Status</h5>
            <p className="section-subtitle">
              Track each department's progress below
            </p>

            {workflow_steps.map((dept, index) => (
              <div
                key={dept.id}
                className={`dept-card ${dept.status.toLowerCase().replace(" ", "-")}`}
                style={{ borderLeftColor: getStatusColor(dept.status) }}
              >
                <div className="dept-header">
                  <div className="dept-order">#{index + 1}</div>
                  <div className="dept-name">{dept.department_name}</div>
                  <div
                    className="dept-status"
                    style={{ backgroundColor: getStatusColor(dept.status) }}
                  >
                    {getStatusIcon(dept.status)} {dept.status}
                  </div>
                </div>

                <div className="dept-details">
                  {dept.status === "Pending" && (
                    <p className="dept-message">⏳ Waiting for review</p>
                  )}
                  {dept.status === "In Progress" && (
                    <p className="dept-message">🔄 Currently under review</p>
                  )}
                  {dept.status === "Under Review" && (
                    <p className="dept-message">
                      👁️ Being reviewed by department
                    </p>
                  )}
                  {dept.status === "Approved" && (
                    <p className="dept-message">✅ Approved</p>
                  )}
                  {dept.status === "Rejected" && (
                    <p className="dept-message">
                      ❌ Rejected: {dept.approver_notes}
                    </p>
                  )}
                  {dept.status === "Completed" && (
                    <p className="dept-message">🏁 Processing completed</p>
                  )}

                  {dept.assigned_date && (
                    <p className="dept-date">
                      📅 Assigned:{" "}
                      {new Date(dept.assigned_date).toLocaleDateString()}
                    </p>
                  )}
                  {dept.completed_date && (
                    <p className="dept-date">
                      ✅ Completed:{" "}
                      {new Date(dept.completed_date).toLocaleDateString()}
                    </p>
                  )}
                  {dept.user_name && (
                    <p className="dept-assignee">
                      👤 Assigned to: {dept.user_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 5/6: Completion */}
        {report.status === "Completed" && (
          <div className="timeline-step active">
            <div className="step-marker">⏳</div>
            <div className="step-details">
              <h6>Awaiting Final Approval</h6>
              <p className="step-time">
                All departments have completed processing
              </p>
              <span className="step-status-badge processing">
                Processing Complete
              </span>
            </div>
          </div>
        )}

        {/* Step 6: Final Approval */}
        {report.status === "Approved" && (
          <div className="timeline-step completed">
            <div className="step-marker">🎉</div>
            <div className="step-details">
              <h6>Fully Approved</h6>
              <p className="step-time">
                All departments approved • Final approval granted
              </p>
              <span className="step-status-badge completed">Approved</span>
            </div>
          </div>
        )}

        {/* Rejection */}
        {report.status === "Rejected" && (
          <div className="timeline-step rejected">
            <div className="step-marker">❌</div>
            <div className="step-details">
              <h6>Record Rejected</h6>
              <p className="step-time">
                One of the departments has rejected this record
              </p>
              <span className="step-status-badge rejected">Rejected</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="tracker-stats">
        <div className="stat-item">
          <span className="stat-label">Total Departments</span>
          <span className="stat-value">{workflow_steps?.length || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Approved</span>
          <span className="stat-value approved">
            {workflow_steps?.filter((s) => s.status === "Approved").length || 0}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pending</span>
          <span className="stat-value pending">
            {workflow_steps?.filter((s) => s.status === "Pending").length || 0}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">In Progress</span>
          <span className="stat-value processing">
            {workflow_steps?.filter((s) => s.status === "In Progress").length ||
              0}
          </span>
        </div>
      </div>

      {/* Current Handler */}
      {report.department_name &&
        report.status !== "Approved" &&
        report.status !== "Rejected" && (
          <div className="current-handler">
            <div className="handler-icon">📍</div>
            <div className="handler-info">
              <strong>Currently at:</strong> {report.department_name}
            </div>
          </div>
        )}

      {/* With Admin indicator */}
      {isWithAdmin && (
        <div className="current-handler" style={{ backgroundColor: "#6f42c1" }}>
          <div className="handler-icon">👑</div>
          <div className="handler-info">
            <strong>Currently with:</strong> Admin for Reassignment
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperTracker;
