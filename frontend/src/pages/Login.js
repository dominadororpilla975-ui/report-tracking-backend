import React, { useCallback, useEffect, useState } from "react";
import { Form, Button, Container, Card, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import PasswordInput from "../components/PasswordInput";
import ChangePasswordModal from "../components/ChangePasswordModal";

function Login() {
  const navigate = useNavigate();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isGoogleConfigured =
    googleClientId && !googleClientId.includes("your-google-client-id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        setError("Google login failed. Please try again.");
        return;
      }

      setError("");
      setLoading(true);
      try {
        const res = await API.post("/google-login", {
          id_token: response.credential,
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userId", res.data.id);
        if (res.data.email) {
          localStorage.setItem("email", res.data.email);
        }
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("name", res.data.name);
        if (res.data.departmentId) {
          localStorage.setItem("departmentId", res.data.departmentId);
        }
        if (res.data.departmentName) {
          localStorage.setItem("departmentName", res.data.departmentName);
        }

        // Check if user needs to change password
        if (res.data.needsPasswordChange) {
          setShowChangePassword(true);
        } else {
          // Navigate based on role
          if (res.data.role === "admin") navigate("/admin-dashboard");
          else if (res.data.role === "client") navigate("/client-dashboard");
          else if (res.data.role === "staff") navigate("/staff-dashboard");
          else navigate("/department-dashboard");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Google login failed");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!isGoogleConfigured) {
      return;
    }

    const existingScript = document.getElementById("google-signin-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-signin-script";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && document.getElementById("google-signin-button")) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById("google-signin-button"),
            { theme: "outline", size: "large" },
          );
          setGoogleReady(true);
        }
      };
      document.body.appendChild(script);
    } else if (
      window.google &&
      document.getElementById("google-signin-button")
    ) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large" },
      );
      setGoogleReady(true);
    }
  }, [googleClientId, handleGoogleCredentialResponse, isGoogleConfigured]);

  const handleGoogleSignInClick = () => {
    if (!isGoogleConfigured) {
      setError(
        "Google sign-in is not configured. Please set a valid REACT_APP_GOOGLE_CLIENT_ID in frontend/.env.",
      );
      return;
    }
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt();
    } else {
      setError("Google sign-in is not ready yet. Please wait a moment.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.id);
      // also save email so it's visible/usable
      if (res.data.email) {
        localStorage.setItem("email", res.data.email);
      }
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);
      if (res.data.departmentId) {
        localStorage.setItem("departmentId", res.data.departmentId);
      }
      if (res.data.departmentName) {
        localStorage.setItem("departmentName", res.data.departmentName);
      }

      // Check if user needs to change password
      if (res.data.needsPasswordChange) {
        setShowChangePassword(true);
      } else {
        // Navigate based on role
        if (res.data.role === "admin") navigate("/admin-dashboard");
        else if (res.data.role === "client") navigate("/client-dashboard");
        else if (res.data.role === "staff") navigate("/staff-dashboard");
        else navigate("/department-dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false);
    const role = localStorage.getItem("role");
    if (role === "admin") navigate("/admin-dashboard");
    else if (role === "client") navigate("/client-dashboard");
    else if (role === "staff") navigate("/staff-dashboard");
    else navigate("/department-dashboard");
  };

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
            <h3 className="mb-0">Login</h3>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          <div className="mb-3 text-center">
            <div className="mx-auto" style={{ width: "100%", maxWidth: 320 }}>
              <div
                id="google-signin-button"
                style={{ minHeight: 50, width: "100%" }}
              />
              {!isGoogleConfigured && (
                <Button
                  variant="outline-primary"
                  className="w-100 mt-2"
                  disabled
                >
                  Google sign-in not configured
                </Button>
              )}
              {isGoogleConfigured && (
                <Button
                  variant="outline-primary"
                  className="w-100 mt-2"
                  onClick={handleGoogleSignInClick}
                  disabled={!googleReady}
                >
                  {googleReady
                    ? "Click to sign in with Google"
                    : "Preparing Google sign-in..."}
                </Button>
              )}
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                id="email"
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Form.Group>

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />

            <Button
              variant="primary"
              type="submit"
              className="w-100"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Form>

          <div className="mt-3 text-center">
            Don't have an account? Please contact your administrator to create
            one.
          </div>
          <div className="text-center mt-4">
            <small className="text-muted">
              Not ready yet?{" "}
              <Link to="/" className="fw-bold">
                Return to Home
              </Link>
            </small>
          </div>
          <div className="text-center mt-2">
            <Link
              to="/forgot-password"
              className="text-muted"
              style={{ fontSize: "0.9rem" }}
            >
              Forgot Password?
            </Link>
          </div>
        </Card.Body>
      </Card>

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </Container>
  );
}

export default Login;
