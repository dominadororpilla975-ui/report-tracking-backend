import React, { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import "../styles/WorkflowTracker.css";

const WorkflowTracker = ({ reportId, onStatusUpdate, role = "client" }) => {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState("");

  const fetchWorkflow = useCallback(async () => {
    try {
      const response = await API.get(`/workflow/report/${reportId}`);
      setWorkflow(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch workflow");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchWorkflow();
    const interval = setInterval(fetchWorkflow, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchWorkflow]);

  const handleApprove = async (notes = "") => {
    setActionInProgress(true);
    try {
      const apiUrl =
        process.env.REACT_APP_API_URL ||
        "https://report-tracking-backend-4.onrender.com";
      const response = await fetch(`${apiUrl}/workflow/approve/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approver_id: localStorage.getItem("user_id") || 1,
          notes: notes || "Approved",
        }),
      });

      if (response.ok) {
        await fetchWorkflow();
        if (onStatusUpdate) onStatusUpdate("approved");
      } else {
        setError("Failed to approve");
      }
    } catch (err) {
      setError("Error approving step");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (reason) => {
    if (!reason.trim()) {
      setError("Rejection reason required");
      return;
    }

    setActionInProgress(true);
    try {
      const apiUrl =
        process.env.REACT_APP_API_URL ||
        "https://report-tracking-backend-4.onrender.com";
      const response = await fetch(`${apiUrl}/workflow/reject/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approver_id: localStorage.getItem("user_id") || 1,
          reason: reason,
        }),
      });

      if (response.ok) {
        await fetchWorkflow();
        if (onStatusUpdate) onStatusUpdate("rejected");
      } else {
        setError("Failed to reject");
      }
    } catch (err) {
      setError("Error rejecting step");
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading)
    return <div className="workflow-loader">Loading workflow...</div>;
  if (!workflow) return <div className="workflow-error">No workflow found</div>;

  const { report, workflow_steps } = workflow;
  const currentStep =
    workflow_steps.find((s) => s.status === "In Progress") ||
    workflow_steps.find((s) => s.status === "Pending");

  return (
    <div className="workflow-tracker">
      <div className="workflow-header">
        <h3>📋 Workflow Progress</h3>
        <span
          className="workflow-status-badge"
          style={{
            backgroundColor:
              report.status === "Completed"
                ? "#28a745"
                : report.status === "Rejected"
                  ? "#dc3545"
                  : report.status === "Processing"
                    ? "#ffc107"
                    : "#6c757d",
          }}
        >
          {report.status}
        </span>
      </div>

      {report.attachment_url && (
        <div className="workflow-attachment mb-3 p-3 bg-light rounded">
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

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="workflow-timeline">
        {workflow_steps.map((step, idx) => (
          <div key={step.id} className="workflow-step">
            <div className={`step-circle ${step.status.toLowerCase()}`}>
              {step.status === "Completed" || step.status === "Approved"
                ? "✓"
                : step.status === "Rejected"
                  ? "✗"
                  : step.status === "In Progress"
                    ? "⏳"
                    : "○"}
            </div>

            <div className="step-content">
              <div className="step-title">
                Step {step.step_number}: {step.department_name}
              </div>
              <div className="step-status">
                Status: <strong>{step.status}</strong>
              </div>

              {step.user_name && (
                <div className="step-assignee">
                  Assigned to: {step.user_name}
                </div>
              )}

              {step.approver_notes && (
                <div className="step-notes">
                  <strong>Notes:</strong> {step.approver_notes}
                </div>
              )}

              {step.completed_date && (
                <div className="step-date">
                  Completed: {new Date(step.completed_date).toLocaleString()}
                </div>
              )}

              {/* Action buttons for current step - Only show for department/admin, not for client */}
              {step.status === "In Progress" &&
                step.id === currentStep?.id &&
                role !== "client" && (
                  <div className="step-actions">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleApprove()}
                      disabled={actionInProgress}
                    >
                      {actionInProgress ? "Processing..." : "✓ Approve"}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        const reason = prompt(
                          "Please provide rejection reason:",
                        );
                        if (reason) handleReject(reason);
                      }}
                      disabled={actionInProgress}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

              {/* Message for client users */}
              {step.status === "In Progress" &&
                step.id === currentStep?.id &&
                role === "client" && (
                  <div className="step-actions">
                    <small className="text-muted">
                      ⏳ Waiting for department approval...
                    </small>
                  </div>
                )}
            </div>

            {idx < workflow_steps.length - 1 && (
              <div
                className={`step-arrow ${
                  step.status === "Completed" || step.status === "Approved"
                    ? "completed"
                    : ""
                }`}
              >
                ↓
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="workflow-stats">
        <span>Total Steps: {report.total_workflow_steps}</span>
        <span>Current Step: {report.current_workflow_step}</span>
        <span>
          Progress:{" "}
          {Math.round(
            (report.current_workflow_step / report.total_workflow_steps) * 100,
          )}
          %
        </span>
      </div>

      <div className="workflow-progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${(report.current_workflow_step / report.total_workflow_steps) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
};

export default WorkflowTracker;
