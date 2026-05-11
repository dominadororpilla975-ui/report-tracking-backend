import React from "react";
import { Navbar as BSNavbar, Container } from "react-bootstrap";

export default function Navbar({ role }) {
  return (
    <BSNavbar bg="dark" variant="dark" className="d-none d-lg-block">
      <Container fluid>
        <BSNavbar.Brand className="fw-bold">
          📋 Record Tracking System
        </BSNavbar.Brand>
      </Container>
    </BSNavbar>
  );
}
