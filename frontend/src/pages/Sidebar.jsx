import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import '../css/Sidebar.css';
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BaseUrlContext } from '../context/BaseUrlContext';

import {
  FaTable,
  FaClipboardList,
  FaUserCog,
  FaUserPlus,
  FaUsers,
  FaUserCircle,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDown,
  FaAngleRight,
  FaPowerOff,
  FaBug,
  FaClock,
  FaClipboardCheck
} from 'react-icons/fa';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const baseUrl = useContext(BaseUrlContext);

  // ✅ Use values from AuthContext
  const { username, role, logout } = useContext(AuthContext);

  // 🔐 Redirect to login if no token or no role
  if (!sessionStorage.getItem('token') || !role) {
    navigate('/');
    return null;
  }

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    if (!collapsed) setShowUserMenu(false);
  };

  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);

  const isManageUsersActive =
    location.pathname === '/add-user' || location.pathname === '/list-users';

  const usernameFirstChar = username?.charAt(0)?.toUpperCase() || '?';
  const usernameFormatted = username?.charAt(0)?.toUpperCase() + username?.slice(1);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="user-info">
            {collapsed && <span className="username-icon">{usernameFirstChar}</span>}
            {!collapsed && <span className="username">{usernameFormatted}</span>}
          </div>
          <button className="collapse-button" onClick={toggleSidebar}>
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        <nav>
          <ul>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setShowUserMenu(false)}
              >
                <span className="nav-icon"><FaTable /></span>
                {!collapsed && <span>Master Table</span>}
              </NavLink>
            </li>
            {role === 'admin' && (
            <NavLink
              to="/pending-requests"
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setShowUserMenu(false)}
            >
              <span className="nav-icon"><FaClock /></span>
              {!collapsed && <span>Pending Requests</span>}
            </NavLink>
          )}

          {role === 'write' && (
            <NavLink
              to="/my-requests"
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setShowUserMenu(false)}
            >
              <span className="nav-icon"><FaClipboardCheck /></span>
              {!collapsed && <span>My Requests</span>}
            </NavLink>
          )}
            <li>
              <NavLink
                to="/test-plan"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setShowUserMenu(false)}
              >
                <span className="nav-icon"><FaClipboardList /></span>
                {!collapsed && <span>Test Plan</span>}
              </NavLink>
            </li>

            {(role === "admin" || role === "read") && (
            <>
            <li>
              <NavLink
                to="/bug-history"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setShowUserMenu(false)}
              >
                <span className="nav-icon"><FaBug /></span>
                {!collapsed && <span>Bug History</span>}
              </NavLink>
            </li>
            </>
            )}

            {role === "admin" && (
              <>
                <li
                  className={`manage-users-toggle ${showUserMenu || isManageUsersActive ? 'active' : ''}`}
                  onClick={toggleUserMenu}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleUserMenu()}
                >
                  <span className="nav-icon"><FaUserCog /></span>
                  {!collapsed && (
                    <>
                      <span>Manage Users</span>
                      {showUserMenu
                        ? <FaAngleDown className="dropdown-icon" />
                        : <FaAngleRight className="dropdown-icon" />}
                    </>
                  )}
                </li>

                {showUserMenu && (
                  <ul className={`sub-menu ${collapsed ? 'collapsed-submenu' : ''}`}>
                    <li className="sub-link">
                      <NavLink
                        to="/add-user"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                        onClick={() => setShowUserMenu(true)}
                      >
                        <span className="nav-icon"><FaUserPlus /></span>
                        <span>Add User</span>
                      </NavLink>
                    </li>
                    <li className="sub-link">
                      <NavLink
                        to="/list-users"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                        onClick={() => setShowUserMenu(true)}
                      >
                        <span className="nav-icon"><FaUsers /></span>
                        <span>List Users</span>
                      </NavLink>
                    </li>
                  </ul>
                )}
              </>
            )}

            <li>
              <NavLink
                to="/profile"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setShowUserMenu(false)}
              >
                <span className="nav-icon"><FaUserCircle /></span>
                {!collapsed && <span>Profile</span>}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div
          className="sidebar-footer"
          onClick={logout}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && logout()}
        >
          <span className="nav-icon"><FaPowerOff /></span>
          {!collapsed && <span>Logout</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
