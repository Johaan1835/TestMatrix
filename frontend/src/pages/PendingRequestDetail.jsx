import { useEffect, useState , useContext} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PermissibleTextarea,
  PermissibleSelect,
  PermissibleButton,
  PermissibleOption,
} from '../components/Permissible';
import '../css/TestCaseDetail.css';
import { BaseUrlContext } from '../context/BaseUrlContext';

export default function PendingRequestDetail() {
  const { testcaseId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [expectedResult, setExpectedResult] = useState('');
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const baseUrl = useContext(BaseUrlContext);
  console.log("Using backend at:", baseUrl);
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/pending-requests/${testcaseId}`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        });

        if (!res.ok) throw new Error('Request not found');
        const data = await res.json();
        setDetails(data);
        setExpectedResult(data.expected_result || '');
        setComments(data.comments || '');
      } catch (err) {
        console.error('Error fetching my request:', err);
        alert('Could not load request details.');
      }
    };

    fetchDetails();
  }, [testcaseId]);

  const handleFieldUpdate = async (field, value) => {
    if (!details) return;

    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/pending-requests/${testcaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error('Update failed');

      setDetails((prev) => ({ ...prev, [field]: value }));
    } catch (err) {
      alert(`Failed to update ${field}`);
      console.error(err);
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
        <h1 className="testcase-title">Pending Request Details</h1>
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
            <span className="detail-label">Submitted By:</span>
            <span className="detail-value">{details.submitted_by}</span>
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
            ← Back to Pending List
          </button>
        </div>

        {isSaving && <div className="saving-indicator">Saving changes...</div>}
      </div>
    </div>
  );
}
