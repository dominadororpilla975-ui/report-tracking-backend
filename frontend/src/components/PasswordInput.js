import React, { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { EyeFill, EyeSlashFill } from "react-bootstrap-icons";

function PasswordInput({
  id = "password",
  name = "password",
  value,
  onChange,
  placeholder,
  disabled = false,
  required = true,
  minLength,
  autoComplete = "current-password",
  className = "mb-3",
}) {
  const [show, setShow] = useState(false);
  const toggleLabel = show ? "Hide password" : "Show password";

  return (
    <InputGroup className={className}>
      <Form.Control
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <Button
        type="button"
        variant="outline-secondary"
        onClick={() => setShow(!show)}
        disabled={disabled}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {show ? <EyeSlashFill /> : <EyeFill />}
      </Button>
    </InputGroup>
  );
}

export default PasswordInput;
