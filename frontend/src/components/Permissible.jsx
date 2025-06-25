// src/components/Permissible.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const useCanEdit = () => {
  const { role } = useContext(AuthContext);
  return ["admin", "write"].includes(role);
};

// Input field
export function PermissibleInput({ className = "", ...props }) {
  const canEdit = useCanEdit();
  return (
    <input 
      className={`${className} ${!canEdit ? "read-only-field" : ""}`}
      readOnly={!canEdit}
      {...props}
    />
  );
}

// Textarea
export function PermissibleTextarea({ className = "", ...props }) {
  const canEdit = useCanEdit();
  return (
    <textarea
      className={`${className} ${!canEdit ? "read-only-field" : ""}`}
      readOnly={!canEdit}
      {...props}
    />
  );
}

// Select dropdown
export function PermissibleSelect({ className = "", children, ...props }) {
  const canEdit = useCanEdit();
  return (
    <select
      className={`${className} ${!canEdit ? "read-only-field" : ""}`}
      disabled={!canEdit}
      {...props}
    >
      {children}
    </select>
  );
}

// Button
// Update your PermissibleButton component
export function PermissibleButton({ children, className = "", disabled = false, ...props }) {
  const canEdit = useCanEdit();
  const isDisabled = disabled || !canEdit;
  
  return (
    <button
      className={`${className} ${isDisabled ? "disabled-button" : ""}`}
      disabled={isDisabled}
      {...props}
    >
      {children}
    </button>
  );
}

// Form wrapper (crucial for submission blocking)
export function PermissibleForm({ children, onSubmit, ...props }) {
  const canEdit = useCanEdit();

  const handleSubmit = (e) => {
    if (!canEdit) {
      e.preventDefault();
      alert("Read-only users cannot submit forms");
      return;
    }
    onSubmit?.(e);
  };

  return (
    <form onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}

// Checkbox
export function PermissibleCheckbox({ className = "", ...props }) {
  const canEdit = useCanEdit();
  return (
    <input
      type="checkbox"
      className={`${className} ${!canEdit ? "read-only-field" : ""}`}
      disabled={!canEdit}
      {...props}
    />
  );
}

// Radio button
export function PermissibleRadio({ className = "", ...props }) {
  const canEdit = useCanEdit();
  return (
    <input
      type="radio"
      className={`${className} ${!canEdit ? "read-only-field" : ""}`}
      disabled={!canEdit}
      {...props}
    />
  );
}

// File input
export function PermissibleFileInput({ className = "", ...props }) {
  const canEdit = useCanEdit();
  return (
    <input
      type="file"
      className={`${className} ${!canEdit ? "read-only-field" : ""}`}
      disabled={!canEdit}
      {...props}
    />
  );
}

// Option (optional utility component)
export function PermissibleOption({ value, children, ...props }) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  );
}

