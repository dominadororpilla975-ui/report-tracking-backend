import React from "react";
import { Container, Card, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";

function Register() {
  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <Card
        className="p-4 login-form-card rounded-4 text-black"
        style={{ maxWidth: "420px", width: "100%" }}
      >
        <Card.Body>
          <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="rounded-circle border border-white border-opacity-75"
              style={{ width: "50px", height: "50px", objectFit: "cover" }}
            />
            <h3 className="mb-0">Account Request</h3>
          </div>
          <Alert variant="info">
            Account creation is managed by the administrator. Please contact the
            admin and provide your email address. You will receive an email with
            your password and the login link once your account is created.
          </Alert>
          <div className="mt-3 text-center">
            Already have an account? <Link to="/login">Login</Link>
          </div>
          <div className="text-center mt-4">
            <small className="text-muted">
              Not ready yet?{" "}
              <Link to="/" className="fw-bold">
                Return to Home
              </Link>
            </small>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Register;
