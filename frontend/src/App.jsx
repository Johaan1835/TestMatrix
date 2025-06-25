// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import MasterTable from './pages/MasterTable.jsx';
import AddTestCases from './pages/AddTestCase.jsx';
import TestPlan from './pages/TestPlan.jsx';
import Sidebar from './pages/Sidebar.jsx';
import './css/App.css';

import LoginPage from './pages/LoginPage.jsx';
import Profile from './pages/Profile.jsx';
import AddUsers from './pages/AddUsers.jsx';
import ListUsers from './pages/ListUsers.jsx';
import BugHistory from './pages/BugHistory.jsx';
import TestCaseDetail from './pages/TestCaseDetail';
import AddTestCase from './pages/AddTestCase.jsx';
import AddTestSuite from './pages/AddTestSuite.jsx';
import PendingRequestDetail from './pages/PendingRequestDetail.jsx';
import MyRequestDetail from './pages/MyRequestDetail.jsx';
import PendingRequest from './pages/PendingRequest.jsx';
import MyRequest from './pages/MyRequest.jsx';

import React from 'react';
import ProtectedRoute from './components/ProtectedRoutes.jsx';

const DashboardLayout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <div className="main-content">{children}</div>
  </div>
);

const App = () => {
  return (
    <Routes>
      {/* Public Login Page */}
      <Route path="/" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'write', 'read']}>
            <DashboardLayout><MasterTable /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-test-case"
        element={
          <ProtectedRoute allowedRoles={['admin', 'write']}>
            <DashboardLayout><AddTestCase /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
      path="/pending-requests"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><PendingRequest /></DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-requests"
      element={
        <ProtectedRoute allowedRoles={['write']}>
          <DashboardLayout><MyRequest /></DashboardLayout>
        </ProtectedRoute>
      }
    />
      <Route
      path="/pending-requests/:testcaseId"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><PendingRequestDetail /></DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-requests/:testcaseId"
      element={
        <ProtectedRoute allowedRoles={['write']}>
          <DashboardLayout><MyRequestDetail /></DashboardLayout>
        </ProtectedRoute>
      }
    />
      <Route
        path="/add-suite"
        element={
          <ProtectedRoute allowedRoles={['admin', 'write']}>
            <DashboardLayout><AddTestSuite/></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-plan"
        element={
          <ProtectedRoute allowedRoles={['admin', 'write', 'read']}>
            <DashboardLayout><TestPlan /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bug-history"
        element={
          <ProtectedRoute allowedRoles={['admin', 'read']}>
            <DashboardLayout><BugHistory /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'write', 'read']}>
            <DashboardLayout><Profile /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-user"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout><AddUsers /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/list-users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout><ListUsers /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
      path="/testcase/:planName/:testcaseId"
      element={
        <ProtectedRoute allowedRoles={['admin', 'write', 'read']}>
          <DashboardLayout><TestCaseDetail /></DashboardLayout>
        </ProtectedRoute>
      }
    />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
