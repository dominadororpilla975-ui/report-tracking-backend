import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import Select from "react-select";
import API from "../services/api";

const ReassignModal = ({
  show,
  onHide,
  report,
  onReassign,
  role = "admin",
}) => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [returnToAdmin, setReturnToAdmin] = useState(false);
  const [budget, setBudget] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await API.get("/admin/departments");
        // Add option to return to admin
        const adminOption = {
          value: "admin",
          label: "👑 Return to Admin (No Department)",
        };
        const deptOptions = (res.data || []).map((d) => ({
          value: d.id,
          label: d.name,
        }));
        setDepartments([adminOption, ...deptOptions]);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };

    if (show) {
      fetchDepartments();
      // Reset form when modal opens
      setSelectedDepartment(null);
      setReturnToAdmin(false);
      setBudget(report?.budget || "");
      setReason("");
      setError("");
    }
  }, [show, report]);

  const handleSubmit = async () => {
    // Check if returning to admin
    if (selectedDepartment?.value === "admin") {
      if (!reason.trim()) {
        setError("Please provide a reason for returning to admin");
        return;
      }
      setLoading(true);
      setError("");
      try {
        // Use the workflow endpoint to return to admin
        await API.put(`/workflow/reassign-department/${report.id}`, {
          new_department_id: null,
          return_to_admin: true,
          reason: reason || "Returned to admin for reassignment",
          updated_by: localStorage.getItem("userId") || 1,
        });
        if (onReassign) {
          onReassign();
        }
        onHide();
      } catch (err) {
        setError(err.response?.data?.message || "Error returning to admin");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular reassignment
    if (!selectedDepartment && !returnToAdmin) {
      setError("Please select a department or choose to return to admin");
      return;
    }

    if (role === "client" && !reason.trim()) {
      setError("Please provide a reason for reassignment");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (role === "admin") {
        if (selectedDepartment?.value) {
          // Reassign to new department using workflow endpoint
          await API.put(`/workflow/reassign-department/${report.id}`, {
            new_department_id: selectedDepartment.value,
            return_to_admin: false,
            reason: reason || "Reassigned by admin",
            updated_by: localStorage.getItem("userId") || 1,
          });
        }
      } else if (role === "client") {
        await API.post(`/client/report/${report.id}/request-reassign`, {
          reason: reason,
        });
      }

      if (onReassign) {
        onReassign();
      }
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || "Error processing request");
    } finally {
      setLoading(false);
    }
  };

  const isReturnToAdmin = selectedDepartment?.value === "admin";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {role === "admin" ? "🔄 Reassign Record" : "📋 Request Reassignment"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError("")} dismissible>
            {error}
          </Alert>
        )}

        {report && (
          <div className="mb-3 p-3 bg-light rounded">
            <strong>Record:</strong> #{report.id} - {report.title}
            <br />
            <small className="text-muted">
              Current Department: {report.department_name || "Not assigned"}
            </small>
          </div>
        )}

        {role === "admin" ? (
          <>
            <Form.Group className="mb-3">
              <Form.Label>
                Select Department{" "}
                <span className="text-muted">
                  (Choose "Return to Admin" to send back without department)
                </span>
              </Form.Label>
              <Select
                options={departments}
                value={selectedDepartment}
                onChange={(option) => {
                  setSelectedDepartment(option);
                  setReturnToAdmin(option?.value === "admin");
                }}
                placeholder="Choose department..."
                isClearable
              />
            </Form.Group>

            {/* Show budget and reason fields only for regular reassignment */}
            {!isReturnToAdmin && (
              <Form.Group className="mb-3">
                <Form.Label>Budget Amount (PHP)</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter budget amount"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Form.Text className="text-muted">
                  Set or update budget for this record
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>
                {isReturnToAdmin
                  ? "Reason for Returning to Admin (Required)"
                  : "Reason for Reassignment"}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder={
                  isReturnToAdmin
                    ? "Enter reason for returning to admin..."
                    : "Enter reason (optional)"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Form.Group>

            {/* Info box for return to admin */}
            {isReturnToAdmin && (
              <Alert variant="info" className="mb-3">
                <strong>ℹ️ Returning to Admin:</strong>
                <br />
                The record will be sent back to Admin without a department
                assignment. Admin can then reassign to the same or different
                department.
              </Alert>
            )}
          </>
        ) : (
          <Form.Group className="mb-3">
            <Form.Label>Reason for Reassignment Request</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Please explain why you are requesting reassignment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Form.Text className="text-muted">
              Your request will be sent to the admin for review
            </Form.Text>
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant={
            isReturnToAdmin
              ? "warning"
              : role === "admin"
                ? "primary"
                : "warning"
          }
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : isReturnToAdmin
              ? "↩️ Return to Admin"
              : role === "admin"
                ? "🔄 Reassign Record"
                : "Submit Request"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReassignModal;
