import { useEffect, useState , useContext} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PermissibleTextarea,
  PermissibleSelect,
  PermissibleButton,
  PermissibleOption,
} from '../components/Permissible';
import { BaseUrlContext } from '../context/BaseUrlContext';
import '../css/TestCaseDetail.css';

export default function MyRequestDetail() {
  const { testcaseId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [expectedResult, setExpectedResult] = useState('');
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const baseUrl = useContext(BaseUrlContext);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      alert('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    fetch(`${baseUrl}/api/pending-request/${testcaseId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error('Unauthorized');
        if (!res.ok) throw new Error('Request not found');
        const data = await res.json();
        setDetails(data);
        setExpectedResult(data.expected_result || '');
        setComments(data.comments || '');
      })
      .catch((err) => {
        console.error('Error fetching my request:', err);
        alert('Could not load request details. Please log in again.');
        navigate('/login');
      });
  }, [testcaseId, navigate]);

  const handleFieldUpdate = async (field, value) => {
  const token = sessionStorage.getItem('token');
  if (!details || !token) {
    alert('Session expired. Please log in again.');
    navigate('/');
    return;
  }

  // ❌ Prevent update if status is 'approved'
  if (details.request_status !== 'pending') {
    alert(`Cannot edit fields. This request is already '${details.request_status}'.`);
    return;
  }

  setIsSaving(true);
  try {
    const res = await fetch(`${baseUrl}/api/pending-request/${testcaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ [field]: value }),
    });

    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) throw new Error('Update failed');

    setDetails((prev) => ({ ...prev, [field]: value }));
  } catch (err) {
    alert(`Failed to update ${field}. Please try again or log in again.`);
    console.error(err);
    navigate('/');
  } finally {
    setIsSaving(false);
  }
};

  if (!details) return <div className="loading-container">Loading...</div>;

  const statusOptions = ['new', 'in-progress', 'completed', 'need-retest'];
  const resultOptions = ['pass', 'fail', 'not-tested'];

  return (
    <div className="testcase-detail-container">
      <div className="testcase-header">
        <h1 className="testcase-title">My Request Details</h1>
        <div className="testcase-scenario">
          <span className="testcase-id">{details.testcase_id}</span>
          <h2 className="scenario-text">{details.test_scenario}</h2>
        </div>
      </div>

      <div className="testcase-content">
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Test Scenario ID:</span>
            <span className="detail-value">{details.test_scenario_id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Expected Result:</span>
            <div className="detail-value">
              <PermissibleTextarea
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                onBlur={() => handleFieldUpdate('expected_result', expectedResult)}
                rows={4}
              />
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <div className="detail-value">
              <PermissibleSelect
                value={details.status || 'new'}
                onChange={(e) => handleFieldUpdate('status', e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <PermissibleOption key={opt} value={opt}>
                    {opt}
                  </PermissibleOption>
                ))}
              </PermissibleSelect>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Test Result:</span>
            <div className="detail-value">
              <PermissibleSelect
                value={details.test_result || 'not-tested'}
                onChange={(e) => handleFieldUpdate('test_result', e.target.value)}
              >
                {resultOptions.map((opt) => (
                  <PermissibleOption key={opt} value={opt}>
                    {opt}
                  </PermissibleOption>
                ))}
              </PermissibleSelect>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Comments:</span>
            <div className="detail-value">
              <PermissibleTextarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                onBlur={() => handleFieldUpdate('comments', comments)}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => navigate(-1)} className="back-button">
            ← Back to My Requests
          </button>
        </div>

        {isSaving && <div className="saving-indicator">Saving changes...</div>}
      </div>
    </div>
  );
}
