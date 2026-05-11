import React, { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      await API.post("/forgot-password", { email });
      setSubmitted(true);
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Card className="p-4 shadow" style={{ maxWidth: "400px", width: "100%" }}>
        <Card.Body>
          <h3 className="text-center mb-4">Forgot Password?</h3>

          {submitted ? (
            <>
              <Alert variant="success">
                <strong>Check your email!</strong> If an account exists with
                this email address, we've sent a password reset link. The link
                expires in 1 hour.
              </Alert>
              <Link to="/login" className="btn btn-primary w-100">
                Back to Login
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted text-center mb-4">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </Form>

              <div className="text-center">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
