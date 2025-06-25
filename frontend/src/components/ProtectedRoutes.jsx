// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role, isLoading } = useContext(AuthContext);

  // 🚫 Wait until auth check is done
  if (isLoading) return null; // or a loading spinner

  // ❌ Not logged in
  if (!role) {
    console.log("⛔ Not authenticated, redirecting to /");
    return <Navigate to="/" replace />;
  }

  // ❌ Role not allowed
  if (!allowedRoles.includes(role)) {
    console.log("⛔ Role not allowed:", role, "Redirecting to /unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
