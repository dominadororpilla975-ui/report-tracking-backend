import React, { useState } from "react";
import { Form, Dropdown } from "react-bootstrap";

export default function DepartmentSelect({
  departments,
  value,
  onChange,
  placeholder = "Select Department",
  required = false,
  includeAllOption = true,
  allOptionLabel = "All Departments",
  includeAdminOption = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDepartments = (departments || []).filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.description &&
        dept.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Check if "admin" is selected (for includeAdminOption)
  const isAdminSelected = value === "admin" || value === "admin";

  // Find selected department from the list
  const selectedDept = (departments || []).find(
    (d) => d.id === parseInt(value),
  );

  // Determine display text
  const getDisplayText = () => {
    if (includeAdminOption && isAdminSelected) {
      return "👑 Back to Admin";
    }
    return selectedDept ? selectedDept.name : placeholder;
  };

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle
        variant="outline-secondary"
        id="department-select-dropdown"
        className="w-100"
        style={{ textAlign: "left" }}
      >
        {getDisplayText()}
      </Dropdown.Toggle>

      <Dropdown.Menu
        style={{ width: "100%", maxHeight: "300px", overflowY: "auto" }}
      >
        <div className="px-3 py-2">
          <Form.Control
            name="department_search"
            type="text"
            placeholder="🔍 Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            size="sm"
          />
        </div>
        <Dropdown.Divider />

        {/* Admin Option */}
        {includeAdminOption && (
          <>
            <Dropdown.Item
              onClick={() => {
                onChange({ target: { value: "admin" } });
                setSearchQuery("");
              }}
              active={isAdminSelected}
            >
              <div>
                <strong>👑 Back to Admin</strong>
                <div className="text-muted small">Return record to admin</div>
              </div>
            </Dropdown.Item>
            <Dropdown.Divider />
          </>
        )}

        {/* All Option */}
        {includeAllOption && !includeAdminOption && (
          <>
            <Dropdown.Item
              onClick={() => {
                onChange({ target: { value: "" } });
                setSearchQuery("");
              }}
              active={value === ""}
            >
              {allOptionLabel}
            </Dropdown.Item>
            <Dropdown.Divider />
          </>
        )}

        {/* Department Options */}
        {filteredDepartments.length > 0 ? (
          filteredDepartments.map((dept) => (
            <Dropdown.Item
              key={dept.id}
              onClick={() => {
                onChange({ target: { value: dept.id.toString() } });
                setSearchQuery("");
              }}
              active={value === dept.id.toString()}
            >
              <div>
                <strong>{dept.name}</strong>
                {dept.description && (
                  <div className="text-muted small">{dept.description}</div>
                )}
              </div>
            </Dropdown.Item>
          ))
        ) : (
          <Dropdown.Item disabled>No departments found</Dropdown.Item>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
