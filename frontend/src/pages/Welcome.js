import React, { useEffect } from "react";
import { Container, Navbar, Nav, Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

function Welcome() {
  useEffect(() => {
    document.title =
      "Municipality of Carranglan Record Tracking and Monitoring System";
  }, []);

  const backgroundImage = `url(${process.env.PUBLIC_URL}/background.png)`;

  return (
    <main className="welcome-page" style={{ backgroundImage }}>
      <Navbar variant="light" expand="lg" className="custom-navbar">
        <Container className="welcome-nav-container">
          <Navbar.Brand className="welcome-brand">
            <img src="/logo.jpg" alt="Municipality logo" />
            <span>Record Monitoring and Tracking System</span>
          </Navbar.Brand>

          <Nav className="welcome-nav-actions">
            <Link to="/login">
              <Button variant="outline-light" className="welcome-nav-button">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="light" className="welcome-nav-button">
                Register
              </Button>
            </Link>
          </Nav>
        </Container>
      </Navbar>

      <section className="welcome-hero">
        <Container>
          <Row className="welcome-hero-grid">
            <Col lg={7}>
              <div className="welcome-copy">
                <div className="welcome-header">
                  <div>
                    <h3>
                      Record Monitoring and Tracking System for the Municipality
                      of Carranglan, Nueva Ecija
                    </h3>
                    <p className="welcome-lead">
                      A web-based system for organized record submission,
                      routing, status tracking, and department monitoring.
                    </p>
                  </div>
                </div>

                <div className="welcome-actions">
                  <Link to="/register">
                    <Button variant="light" size="lg">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline-light" size="lg">
                      Login
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="location-section">
                <div className="location-header">
                  <div>
                    <h2 className="location-label">
                      Municipality Hall Location
                    </h2>
                    <h2 className="location-address">
                      X367+46W, Provincial Rd, Carranglan, Nueva Ecija
                    </h2>
                  </div>
                  <Link to="/login">
                    <Button variant="outline-light" size="sm">
                      Track Records
                    </Button>
                  </Link>
                </div>

                <img
                  src="/location.png"
                  alt="Municipality Hall location map"
                  className="location-map"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="welcome-section">
        <Container>
          <div className="welcome-section-heading">
            <p className="welcome-eyebrow">System Features</p>
            <h2>Built for clearer workflows and faster updates</h2>
          </div>

          <Row className="welcome-feature-grid">
            <Col md={4}>
              <article className="feature-text-box">
                <span>01</span>
                <h3>Record Submission</h3>
                <p>
                  Clients can submit records quickly and monitor their status in
                  real time.
                </p>
              </article>
            </Col>

            <Col md={4}>
              <article className="feature-text-box">
                <span>02</span>
                <h3>Status Tracking</h3>
                <p>
                  Staff and departments can update progress and manage record
                  workflow efficiently.
                </p>
              </article>
            </Col>

            <Col md={4}>
              <article className="feature-text-box">
                <span>03</span>
                <h3>Role-Based Access</h3>
                <p>
                  Secure access control for Admin, Staff, Clients, and
                  Departments.
                </p>
              </article>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="welcome-footer">
        <Container className="welcome-footer-content">
          <div>
            <p className="welcome-eyebrow">Ready to start?</p>
            <h2>Experience efficient record management.</h2>
          </div>

          <div className="welcome-actions">
            <Link to="/register">
              <Button variant="light" size="lg">
                Create an Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline-light" size="lg">
                Login
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}

export default Welcome;
