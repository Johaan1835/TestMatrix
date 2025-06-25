import React, { useState, useEffect, useContext } from "react";
import '../css/Profile.css';
import { AuthContext } from '../context/AuthContext';
import { BaseUrlContext } from '../context/BaseUrlContext';

function Profile() {
  const { username, logout } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const token = sessionStorage.getItem('token');
  const baseUrl = useContext(BaseUrlContext);

  useEffect(() => {
    if (!token || !username) {
      alert("Please log in again.");
      window.location.href = "/";
      return;
    }

    fetch(`${baseUrl}/profile?username=${encodeURIComponent(username)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch email');
        return res.json();
      })
      .then(data => setEmail(data.email))
      .catch(err => {
        console.error('Error fetching email:', err);
        alert("Please log in again.");
        window.location.href = "/";
      });
  }, [token, username]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to change password');

      alert("Password changed successfully.");
      setShowPasswordModal(false);
      e.target.reset();
    } catch (err) {
      console.error('Error changing password:', err);
      alert(err.message || "An error occurred while changing password.");
    }
  };

  const handlePasswordModal = () => setShowPasswordModal(!showPasswordModal);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Admin Profile</h2>
        <p className="profile-subtitle">Manage your account settings</p>
      </div>

      <div className="profile-card">
        <div className="profile-info">
          <div className="profile-field">
            <label>Name</label>
            <div className="profile-value">{username || '-'}</div>
          </div>
          <div className="profile-field">
            <label>Email</label>
            <div className="profile-value">{email || '-'}</div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn-primary" onClick={handlePasswordModal}>
            Change Password
          </button>
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPasswordModal(false)}>&times;</button>
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" name="currentPassword" required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" name="newPassword" required minLength="6" />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
