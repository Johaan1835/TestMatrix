import { useEffect, useState , useContext} from 'react';
import '../css/BugHistory.css';
import { BaseUrlContext } from '../context/BaseUrlContext';
import { Link } from 'react-router-dom'; // ✅ Make sure you import Link

export default function BugHistory() {
  const [bugs, setBugs] = useState([]);
  const baseUrl = useContext(BaseUrlContext);

  useEffect(() => {
    fetch(`${baseUrl}/api/bug-history`)
      .then(res => res.json())
      .then(setBugs)
      .catch(console.error);
  }, []);

  const handleStatusChange = (bugId, testcaseId, testPlanName, newStatus) => {
    fetch(`${baseUrl}/api/bug-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bug_id: bugId,
        testcase_id: testcaseId,
        test_plan_name: testPlanName,
        status: newStatus,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status');
        // Update local state
        setBugs(prev =>
          prev.map(b =>
            b.bug_id === bugId &&
            b.testcase_id === testcaseId &&
            b.test_plan_name === testPlanName
              ? { ...b, bug_status: newStatus }
              : b
          )
        );
      })
      .catch(err => {
        console.error('Status update failed:', err);
        alert('Failed to update status. Try again.');
      });
  };

  const changeableStatusOptions = ['In Progress', 'Resolved'];

  return (
    <div className="bug-history-container">
      <h1>Bug History</h1>
      <table className="bug-history-table">
        <thead>
          <tr>
            <th>Bug ID</th>
            <th>Title</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Testcase ID</th>
            <th>Test Plan</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug, index) => (
            <tr key={index}>
              <td>BUG-{bug.bug_id}</td>
              <td>{bug.title}</td>
              <td>{bug.severity}</td>
              <td>
                <select
                  className="status-dropdown"
                  value={bug.bug_status || ''}
                  onChange={e =>
                    handleStatusChange(bug.bug_id, bug.testcase_id, bug.test_plan_name, e.target.value)
                  }
                >
                  <option value={bug.bug_status}>{bug.bug_status}</option>
                  {changeableStatusOptions
                    .filter(opt => opt !== bug.bug_status)
                    .map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                </select>
              </td>
              <td>
                <Link
                to={`/testcase/${encodeURIComponent(bug.test_plan_name)}/${encodeURIComponent(bug.testcase_id)}`}
                className="testcase-link"
                >
                {bug.testcase_id}
                </Link>
              </td>
              <td>{bug.test_plan_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}