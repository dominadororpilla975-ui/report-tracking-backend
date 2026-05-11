import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import API from "../services/api";
import PasswordInput from "./PasswordInput";

export default function ChangePasswordModal({ show, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Both fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await API.post("/change-password", { newPassword });
      setNewPassword("");
      setConfirmPassword("");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Set Your Password</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">
          You logged in with a temporary password. Please set a new password for
          your account.
        </p>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>New Password</Form.Label>
            <PasswordInput
              id="changeNewPassword"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              className=""
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Confirm Password</Form.Label>
            <PasswordInput
              id="changeConfirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              className=""
            />
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            className="w-100"
            disabled={loading}
          >
            {loading ? "Setting Password..." : "Set Password"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
