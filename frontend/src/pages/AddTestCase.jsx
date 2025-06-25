import React, { useState, useEffect , useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BaseUrlContext } from '../context/BaseUrlContext';
import '../css/AddTestCase.css';

const AddTestCase = () => {
  const baseUrl = useContext(BaseUrlContext);
  console.log("Using backend at:", baseUrl);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    test_scenario: '',
    testcase_description: '',
    prerequisite: '',
    steps_to_reproduce: [''],
    expected_result: [''],
    comments: '',
    test_suite: ''
  });

  const [testSuites, setTestSuites] = useState([]);
  const [popup, setPopup] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const defaultSuites = ['Users', 'Logs', 'Inference', 'Models'];
    const stored = JSON.parse(sessionStorage.getItem('testSuites')) || defaultSuites;
    const unique = [...new Set(stored.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))];
    setTestSuites(unique);
  }, []);

  const showPopup = (message, type = 'error') => {
    setPopup({ message, type });
    setTimeout(() => setPopup(null), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStepChange = (index, value, type) => {
    const updated = [...formData[type]];
    updated[index] = value;
    setFormData({ ...formData, [type]: updated });
  };

  const addField = (type) => {
    setFormData({ ...formData, [type]: [...formData[type], ''] });
  };

  const removeField = (index, type) => {
    const updated = [...formData[type]];
    if (updated.length <= 1) return;
    updated.splice(index, 1);
    setFormData({ ...formData, [type]: updated });
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.test_scenario.trim()) errors.push("Test Scenario is required.");
    if (!formData.testcase_description.trim()) errors.push("Test Case Description is required.");
    if (!formData.prerequisite.trim()) errors.push("Prerequisite is required.");
    if (!formData.test_suite.trim()) errors.push("Test Suite must be selected.");
    if (formData.steps_to_reproduce.length !== formData.expected_result.length) {
      errors.push("Steps to Reproduce and Expected Result count must match.");
    }
    if (formData.steps_to_reproduce.some(s => !s.trim())) {
      errors.push("All Steps to Reproduce must be filled.");
    }
    if (formData.expected_result.some(r => !r.trim())) {
      errors.push("All Expected Results must be filled.");
    }

    return errors;
  };

  const handleSubmit = async (e, addAndNext = false) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    const errors = validateForm();
    if (errors.length > 0) {
      showPopup(errors.join('\n'), 'error');
      setIsSubmitting(false);
      return;
    }

    const token = sessionStorage.getItem('token');
    let role = '';

    // Decode role from token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        role = payload.role;
      } catch (err) {
        showPopup("Invalid token. Please login again.", 'error');
        setIsSubmitting(false);
        return;
      }
    }

    const endpoint =
      role === 'admin'
        ? `${baseUrl}/api/testcases`
        : `${baseUrl}/api/submit-test-case`;

    const payload = {
      ...formData,
      steps_to_reproduce: formData.steps_to_reproduce.join('\n'),
      expected_result: formData.expected_result.join('\n'),
      actual_result: '',
      test_result: 'not-tested',
      status: 'not-tested'
    };

    try {
      await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      showPopup('Test case submitted successfully!', 'success');

      setFormData({
        test_scenario: '',
        testcase_description: '',
        prerequisite: '',
        steps_to_reproduce: [''],
        expected_result: [''],
        comments: '',
        test_suite: ''
      });

      if (!addAndNext) navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        showPopup("Unauthorized: Please login again.", 'error');
      } else if (err.response?.status === 409) {
        showPopup("Test case already exists for this suite.", 'error');
      } else {
        showPopup("Error submitting test case.", 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-wrapper">
      {popup && (
        <div className={`popup ${popup.type === 'success' ? 'popup-success' : 'popup-error'}`}>
          {popup.message.split('\n').map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}

      <form className="form-container" onSubmit={(e) => handleSubmit(e, false)}>
        <h2>Test Case Submission</h2>

        <div className="form-group suite-group">
          <label>Test Suite</label>
          <div className="suite-inline" style={{ display: 'flex', gap: '10px' }}>
            <select
              className="form-input"
              name="test_suite"
              value={formData.test_suite}
              onChange={handleChange}
            >
              <option value="">Select</option>
              {testSuites.map((suite, i) => (
                <option key={i} value={suite}>{suite}</option>
              ))}
            </select>
            <button
              type="button"
              className="add-suite-btn small-btn"
              onClick={() => navigate('/add-suite')}
            >
              + Add Suite
            </button>
          </div>
        </div>

        {['test_scenario', 'testcase_description', 'prerequisite', 'comments'].map((field, idx) => (
          <div className="form-group" key={idx}>
            <label>{field.replace(/_/g, ' ')}</label>
            <textarea
              name={field}
              className="form-input"
              value={formData[field]}
              onChange={handleChange}
            />
          </div>
        ))}

        <div className="form-group">
          <label>Steps to Reproduce</label>
          {formData.steps_to_reproduce.map((step, i) => (
            <div key={i} className="step-row">
              <textarea
                className="form-input"
                value={step}
                onChange={(e) => handleStepChange(i, e.target.value, 'steps_to_reproduce')}
              />
              {formData.steps_to_reproduce.length > 1 && (
                <button type="button" onClick={() => removeField(i, 'steps_to_reproduce')}>✖</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addField('steps_to_reproduce')}>+ Add Step</button>
        </div>

        <div className="form-group">
          <label>Expected Result</label>
          {formData.expected_result.map((res, i) => (
            <div key={i} className="step-row">
              <textarea
                className="form-input"
                value={res}
                onChange={(e) => handleStepChange(i, e.target.value, 'expected_result')}
              />
              {formData.expected_result.length > 1 && (
                <button type="button" onClick={() => removeField(i, 'expected_result')}>✖</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addField('expected_result')}>+ Add Result</button>
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button">Add Test Case</button>
          <button
            type="button"
            className="submit-button"
            onClick={(e) => handleSubmit(e, true)}
          >
            Add & Next
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={() => {
              setFormData({
                test_scenario: '',
                testcase_description: '',
                prerequisite: '',
                steps_to_reproduce: [''],
                expected_result: [''],
                comments: '',
                test_suite: ''
              });
              navigate('/dashboard');
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTestCase;