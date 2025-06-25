import { useEffect, useState , useContext} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PermissibleSelect,
  PermissibleTextarea,
  PermissibleButton,
  PermissibleOption,
} from '../components/Permissible';
import '../css/TestCaseDetail.css';
import { BaseUrlContext } from '../context/BaseUrlContext';

export default function TestCaseDetail() {
  const { planName, testcaseId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actualResult, setActualResult] = useState('');
  const [comments, setComments] = useState('');
  const [bugSeverity, setBugSeverity] = useState('low');
  const [bugTitleInput, setBugTitleInput] = useState('');
  const [bugDescriptionInput, setBugDescriptionInput] = useState('');
  const [matchedBugs, setMatchedBugs] = useState([]);
  const [showBugModal, setShowBugModal] = useState(false);
  const baseUrl = useContext(BaseUrlContext);

  const role = sessionStorage.getItem('role');

  useEffect(() => {
    if (!planName || !testcaseId) return;

    fetch(`${baseUrl}/api/test-plan/${planName}/${testcaseId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Test case not found');
        const data = await res.json();
        setDetails(data);
        setActualResult(data.actual_result || '');
        setComments(data.comments || '');
      })
      .catch((err) => {
        console.error('Error fetching details:', err);
        alert('Could not load test case details. Please try again.');
      });
  }, [testcaseId, planName]);

  const handleFieldUpdate = async (field, value) => {
    if (!details || !planName) return;

    setIsSaving(true);
    try {
      const res = await fetch(
       `${baseUrl}/api/test-plan/${planName}/${testcaseId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
          body: JSON.stringify({ [field]: value }),
        }
      );

      if (!res.ok) throw new Error('Update failed');

      setDetails((prev) => ({ ...prev, [field]: value }));

      if (field === 'test_result' && value === 'fail') {
        setBugTitleInput('');
        setMatchedBugs([]);
      }
    } catch (err) {
      alert(`Failed to update ${field}`);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchBugSuggestions = async (title) => {
    if (!title || title.trim() === '') return;

    const res = await fetch(`${baseUrl}/api/bugs/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (res.ok) {
      const data = await res.json();
      setMatchedBugs(data.slice(0, 5));
    }
  };

  const linkExistingBug = async (bugId) => {
    await fetch(`${baseUrl}/api/test-plan/${planName}/${testcaseId}/bug`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
      body: JSON.stringify({ bug_id: bugId }),
    });
    setDetails((prev) => ({ ...prev, bug_id: bugId }));
  };

  const handleNewBugSubmit = async () => {
    const res = await fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        title: bugTitleInput,
        description: bugDescriptionInput,
        severity: bugSeverity,
      }),
    });

    const data = await res.json();
    await linkExistingBug(data.id);
    setShowBugModal(false);
  };

  const formatMultiline = (text) =>
    text ? text.split('\n').map((line, i) => <div key={i}>{line}</div>) : '-';

  const statusPermissibleOptions = ['new', 'in-progress', 'completed', 'need-retest'];
  const resultPermissibleOptions = ['pass', 'fail', 'not-tested'];

  if (!details) return <div className="loading-container">Loading...</div>;

  return (
    <div className="testcase-detail-container">
      <div className="testcase-header">
        <h1 className="testcase-title">Test Case Details</h1>
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
            <span className="detail-label">Description:</span>
            <span className="detail-value">{details.testcase_description}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Prerequisite:</span>
            <div className="detail-value multiline">
              {formatMultiline(details.prerequisite)}
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Steps to Reproduce:</span>
            <div className="detail-value multiline">
              {formatMultiline(details.steps_to_reproduce)}
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Expected Result:</span>
            <div className="detail-value multiline">
              {formatMultiline(details.expected_result)}
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Actual Result:</span>
            <div className="detail-value">
              <PermissibleTextarea
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                onBlur={() => handleFieldUpdate('actual_result', actualResult)}
                rows={5}
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
                {statusPermissibleOptions.map((opt) => (
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
                {resultPermissibleOptions.map((opt) => (
                  <PermissibleOption key={opt} value={opt}>
                    {opt}
                  </PermissibleOption>
                ))}
              </PermissibleSelect>
            </div>
          </div>

          {/* BUG FILING SECTION */}
          {['admin', 'write'].includes(role) && details.test_result === 'fail' && (
            <div className="detail-row">
              <span className="detail-label">Bug Title:</span>
              <div className="detail-value">
                <PermissibleTextarea
                  value={bugTitleInput}
                  onChange={(e) => {
                    setBugTitleInput(e.target.value);
                    fetchBugSuggestions(e.target.value);
                  }}
                  rows={2}
                />
              </div>

              {matchedBugs.length > 0 && (
                <div className="matched-bug-list">
                  <strong>Possible Matches:</strong>
                  <ul>
                    {matchedBugs.map((bug) => (
                      <li key={bug.id} className="matched-bug-item">
                        BUG-{bug.id}: {bug.title}
                        <PermissibleButton
                          onClick={() => {
                            linkExistingBug(bug.id);
                            setBugTitleInput(bug.title);
                            setMatchedBugs([]);
                          }}
                          style={{ marginLeft: '10px' }}
                        >
                          Accept Match
                        </PermissibleButton>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <PermissibleButton onClick={() => setShowBugModal(true)}>
                Report New Bug
              </PermissibleButton>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">Bug ID:</span>
            <span className="detail-value">
              {details.bug_id ? `BUG-${details.bug_id}` : '—'}
            </span>
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

          <div className="detail-row">
            <span className="detail-label">Test Suite:</span>
            <span className="detail-value">{details.test_suite}</span>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => navigate(-1)} className="back-button">
            ← Back to Test Plan
          </button>
        </div>

        {isSaving && <div className="saving-indicator">Saving changes...</div>}

        {/* MODAL TO ADD NEW BUG */}
        {showBugModal && (
          <div className="bug-modal-overlay">
            <div className="bug-modal">
              <h3>Report New Bug</h3>
              <PermissibleTextarea
                placeholder="Bug Title"
                value={bugTitleInput}
                onChange={(e) => setBugTitleInput(e.target.value)}
              />
              <PermissibleTextarea
                placeholder="Bug Description"
                value={bugDescriptionInput}
                onChange={(e) => setBugDescriptionInput(e.target.value)}
                rows={4}
              />
              <PermissibleSelect
                value={bugSeverity}
                onChange={(e) => setBugSeverity(e.target.value)}
                className="severity-dropdown"
              >
                <PermissibleOption value="low">Low</PermissibleOption>
                <PermissibleOption value="medium">Medium</PermissibleOption>
                <PermissibleOption value="high">High</PermissibleOption>
                <PermissibleOption value="critical">Critical</PermissibleOption>
              </PermissibleSelect>
              <PermissibleButton onClick={handleNewBugSubmit}>Submit Bug</PermissibleButton>
              <PermissibleButton onClick={() => setShowBugModal(false)}>Cancel</PermissibleButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}