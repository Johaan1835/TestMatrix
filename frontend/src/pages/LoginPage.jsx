import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { BaseUrlContext } from '../context/BaseUrlContext';
import "../css/LoginPage.css";

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const { setUserInfo } = useContext(AuthContext);
  const baseUrl = useContext(BaseUrlContext);
  const navigate = useNavigate();

  // 🚫 Redirect if already logged in
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (res.ok) {
        const { user, token } = data;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("username", user.username);
        sessionStorage.setItem("role", user.role);
        sessionStorage.setItem("email", user.email);

        setUserInfo({ username: user.username, role: user.role });

        alert("Login successful");

        navigate("/dashboard", { replace: true }); // 🔄 replace login route
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin} noValidate>
        <h2>Login</h2>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={credentials.username}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={credentials.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
