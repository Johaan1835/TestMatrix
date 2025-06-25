import React, { useState, useEffect , useContext} from 'react';
import { Searchbar } from '../components/Searchbar';
import { BaseUrlContext } from '../context/BaseUrlContext';
import '../css/ListUsers.css';

function ListUsers() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: "", email: "", role: "" });
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const token = sessionStorage.getItem('token'); // 🔐 Retrieve token
  const baseUrl = useContext(BaseUrlContext);

  useEffect(() => {
    if (!token) {
      alert("Unauthorized: No token found.");
      return;
    }

    fetch(`${baseUrl}/list-users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, [token]);

  const handleEdit = (user) => {
    setEditingUser(user.emp_id);
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role
    });
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!token) {
      alert("Unauthorized: No token found.");
      return;
    }

    const res = await fetch(`${baseUrl}/list-users/${editingUser}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const updatedUser = await res.json();
      setUsers(users.map(user => user.emp_id === editingUser ? updatedUser : user));
      setEditingUser(null);
      setFormData({ username: "", email: "", role: "" });
    } else {
      alert("Failed to update user");
    }
  };

  const handleCheckboxChange = (emp_id) => {
    setSelectedUsers(prev =>
      prev.includes(emp_id)
        ? prev.filter(id => id !== emp_id)
        : [...prev, emp_id]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.emp_id));
    }
  };

  const handleDeleteSelected = () => {
    if (!window.confirm("Are you sure you want to delete selected users?")) return;
    if (!token) {
      alert("Unauthorized: No token found.");
      return;
    }

    Promise.all(
      selectedUsers.map(id =>
        fetch(`${baseUrl}/list-users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      )
    )
      .then(() => {
        setUsers(prev => prev.filter(user => !selectedUsers.includes(user.emp_id)));
        setSelectedUsers([]);
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="container">
      <h2 className="title">Active Users</h2>
      <Searchbar search={search} setSearch={setSearch} />

      {selectedUsers.length > 0 && (
        <button className="delete-btn" onClick={handleDeleteSelected}>
          Delete Selected ({selectedUsers.length})
        </button>
      )}

      <table className="user-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedUsers.length === users.length}
                onChange={handleSelectAll}
              />
            </th>
            <th>Emp ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users
            .filter((user) => {
              if (search === "") return true;
              const lowerSearch = search.toLowerCase();
              return user.username.toLowerCase().includes(lowerSearch) || user.email.toLowerCase().includes(lowerSearch);
            })
            .map(user => (
              <tr key={user.emp_id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.emp_id)}
                    onChange={() => handleCheckboxChange(user.emp_id)}
                  />
                </td>
                <td>{user.emp_id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(user)}>Edit</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit User</h3>
            <form onSubmit={handleUpdate}>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleFormChange}
                placeholder="Username"
                required
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="Email"
                required
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                required
              >
                <option value="">Select Role</option>
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="update-btn">Update</button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListUsers;
