import React, { useEffect, useState , useContext} from 'react';
import { Link } from 'react-router-dom';
import { BaseUrlContext } from '../context/BaseUrlContext';
import axios from 'axios';

const PendingRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const baseUrl = useContext(BaseUrlContext);

  const fetchPending = async () => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`${baseUrl}/api/pending-requests/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (testcase_id) => {
    const token = sessionStorage.getItem('token');
    try {
      await axios.post(
        `${baseUrl}/api/pending-requests/${testcase_id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Request approved');
      fetchPending();
    } catch (err) {
      console.error('Error approving:', err);
      alert('Failed to approve request');
    }
  };

  const handleReject = async (testcase_id) => {
    const token = sessionStorage.getItem('token');
    try {
      await axios.post(
        `${baseUrl}/api/pending-requests/${testcase_id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Request rejected');
      fetchPending();
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Failed to reject request');
    }
  };

  return (
    <div className="plan-details">
      <h2>Pending Requests</h2>
      {pendingRequests.length > 0 ? (
        <table className="test-case-table">
          <thead>
            <tr>
              <th>TEST SCENARIO ID</th>
              <th>TEST SUMMARY</th>
              <th>TESTCASE ID</th>
              <th>TEST RESULT</th>
              <th>STATUS</th>
              <th>COMMENTS</th>
              <th>SUBMITTED BY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests
              .filter((t) => t.request_status === 'pending')
              .map((testcase) => (
                <tr key={testcase.testcase_id}>
                  <td>{testcase.test_scenario_id}</td>
                  <td>{testcase.test_scenario}</td>
                  <td>
                    <Link to={`/pending-requests/${testcase.testcase_id}`}>
                      {testcase.testcase_id}
                    </Link>
                  </td>
                  <td>{testcase.test_result}</td>
                  <td>{testcase.status}</td>
                  <td>{testcase.comments}</td>
                  <td>{testcase.submitted_by}</td>
                  <td>
                    <button
                      className="action-button approve"
                      onClick={() => handleApprove(testcase.testcase_id)}
                    >
                      Approve
                    </button>
                    <button
                      className="action-button reject"
                      onClick={() => handleReject(testcase.testcase_id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <p>No pending requests found.</p>
      )}
    </div>
  );
};

export default PendingRequests;
