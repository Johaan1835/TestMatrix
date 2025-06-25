import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseUrlContext } from '../context/BaseUrlContext';
import '../css/AddTestCase.css';

const defaultSuites = ["Logs", "Models", "Inference", "Users"];

const AddTestSuite = () => {
  const baseUrl = useContext(BaseUrlContext);
  console.log("Using backend at:", baseUrl);
  const navigate = useNavigate();
  const [suites, setSuites] = useState(defaultSuites);
  const [newSuite, setNewSuite] = useState("");
  const [popup, setPopup] = useState({ message: '', type: '' });

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("testSuites"));
    if (stored && Array.isArray(stored)) {
      const unique = [...new Set([...defaultSuites, ...stored.map(s => capitalize(s))])];
      setSuites(unique);
    }
  }, []);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const showPopup = (message, type = 'error') => {
    setPopup({ message, type });
    setTimeout(() => setPopup({ message: '', type: '' }), 3000);
  };

  const handleAddSuite = () => {
    const trimmed = newSuite.trim();
    if (!trimmed) return showPopup("Test suite name cannot be empty.");
    const normalized = capitalize(trimmed);
    if (suites.map(s => s.toLowerCase()).includes(normalized.toLowerCase())) {
      return showPopup("Suite already exists.");
    }

    const updated = [...suites, normalized].sort();
    setSuites(updated);
    sessionStorage.setItem("testSuites", JSON.stringify(updated));
    setNewSuite("");
    showPopup(`Suite "${normalized}" added!`, 'success');
  };

  const handleDeleteSuite = (suiteToDelete) => {
    if (defaultSuites.includes(suiteToDelete)) {
      return showPopup(`Default suite "${suiteToDelete}" cannot be deleted.`);
    }

    const updated = suites.filter(suite => suite !== suiteToDelete);
    setSuites(updated);
    sessionStorage.setItem("testSuites", JSON.stringify(updated));
    showPopup(`Suite "${suiteToDelete}" deleted.`, 'success');
  };

  return (
    <div className="app-wrapper">
      <h2>Manage Test Suites</h2>

      {popup.message && (
        <div className={`popup ${popup.type === 'success' ? 'popup-success' : 'popup-error'}`}>
          {popup.message}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="newSuite">Add New Test Suite</label>
        <input
          className="form-input"
          id="newSuite"
          placeholder="Enter new test suite"
          value={newSuite}
          onChange={(e) => setNewSuite(e.target.value)}
        />
      </div>

      <div className="button-group">
        <button className="submit-button" onClick={handleAddSuite}>➕ Add Suite</button>
        <button className="cancel-button" onClick={() => navigate("/add-test-case")}>← Back</button>
        <button className="cancel-button" onClick={() => setNewSuite("")}>❌ Clear</button>
      </div>

      <div className="form-group">
        <label>Available Test Suites</label>
        <ul className="suite-list">
          {suites.map((s, i) => (
            <li key={i} className="suite-item">
              {s}
              {!defaultSuites.includes(s) && (
                <button className="delete-btn" onClick={() => handleDeleteSuite(s)}>❌</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AddTestSuite;