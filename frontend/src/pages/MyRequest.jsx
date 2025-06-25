import React, { useEffect, useState , useContext} from 'react';
import { BaseUrlContext } from '../context/BaseUrlContext';
import { Link } from 'react-router-dom';

const MyRequests = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [error, setError] = useState(null);
  const baseUrl = useContext(BaseUrlContext);

  const fetchMyRequests = async () => {
    const token = sessionStorage.getItem('token');

    // Early exit if no token found
    if (!token) {
      console.error('No token found. User might not be logged in.');
      setError('You must be logged in to view your requests.');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/pending-request/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
        // Removed credentials: 'include' as it's not needed for JWT
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const data = await response.json();
      setMyRequests(data);
    } catch (err) {
      console.error('Full error:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  return (
    <div className="plan-details">
      <h2>My Requests</h2>
      {error && <div className="error-message">Error: {error}</div>}

      {myRequests.length > 0 ? (
        <table className="test-case-table">
          <thead>
            <tr>
              <th>TEST SCENARIO ID</th>
              <th>TEST SUMMARY</th>
              <th>TESTCASE ID</th>
              <th>TEST RESULT</th>
              <th>STATUS</th>
              <th>COMMENTS</th>
              <th>REQUEST STATUS</th>
            </tr>
          </thead>
          <tbody>
            {myRequests.map((testcase) => (
              <tr key={testcase.testcase_id}>
                <td>{testcase.test_scenario_id}</td>
                <td>{testcase.test_scenario}</td>
                <td>
                  <Link to={`/my-requests/${testcase.testcase_id}`}>
                    {testcase.testcase_id}
                  </Link>
                </td>
                <td>{testcase.test_result}</td>
                <td>{testcase.status}</td>
                <td>{testcase.comments}</td>
                <td>{testcase.request_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : !error ? (
        <p>No requests submitted yet.</p>
      ) : null}
    </div>
  );
};

export default MyRequests;
