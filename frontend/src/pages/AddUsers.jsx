import React, { useState , useContext} from "react";
import "../css/AddUsers.css";
import { BaseUrlContext } from '../context/BaseUrlContext';

const generatePassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  return password;
};

const AddUsers = () => {
  const baseUrl = useContext(BaseUrlContext);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: ""
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const token = sessionStorage.getItem('token'); // 🟡 Get token from sessionStorage

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors({ ...formErrors, [e.target.name]: "" });
    setSuccessMsg("");
  };

  const validateForm = () => {
    const errors = {};
    const { username, email, role } = formData;

    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email is not valid";
    }

    if (!role) {
      errors.role = "Role is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!token) {
      alert("Unauthorized: No token found.");
      return;
    }

    setIsSubmitting(true);
    const password = generatePassword();
    const dataToSend = { ...formData, password };

    try {
      const res = await fetch(`${baseUrl}/add-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`User added successfully with password: ${password}`);
        setFormData({
          username: "",
          email: "",
          role: ""
        });
        setFormErrors({});
      } else {
        alert(data.error || "Failed to add user");
      }
    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="form-container">
        <form className="user-form" onSubmit={handleSubmit} noValidate>
          <h2>Add New User</h2>
          {successMsg && <p className="success-msg">{successMsg}</p>}

          <label>
            Username:
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {formErrors.username && <small className="error">{formErrors.username}</small>}
          </label>

          <label>
            Email:
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {formErrors.email && <small className="error">{formErrors.email}</small>}
          </label>

          <label>
            Role:
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="">Select Role</option>
              <option value="read">Read</option>
              <option value="write">Write</option>
            </select>
            {formErrors.role && <small className="error">{formErrors.role}</small>}
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddUsers;
