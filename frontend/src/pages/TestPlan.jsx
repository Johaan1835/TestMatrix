import React, { useState, useEffect, useContext } from 'react';
import '../css/TestPlan.css';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  PermissibleInput,
  PermissibleTextarea,
  PermissibleSelect,
  PermissibleButton,
  PermissibleCheckbox,
  PermissibleForm,
  PermissibleOption
} from "../components/Permissible";
import { AuthContext } from '../context/AuthContext';
import { BaseUrlContext } from '../context/BaseUrlContext';

const TestPlan = () => {
  const [showForm, setShowForm] = useState(false);
  const [pieData, setPieData] = useState(null);
  const [planName, setPlanName] = useState('');
  const [selectedSuites, setSelectedSuites] = useState([]);
  const [availableSuites, setAvailableSuites] = useState([]);
  const [testPlans, setTestPlans] = useState([]);
  const [openPlan, setOpenPlan] = useState(null);
  const [planTestCases, setPlanTestCases] = useState({});
  const [editedRows, setEditedRows] = useState({});
  const [numTestRuns, setNumTestRuns] = useState(0);
  const [numTesters, setNumTesters] = useState(0);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [suiteIds, setSuiteIds] = useState({});
  const [selectedSuiteForTestRun, setSelectedSuiteForTestRun] = useState('');
  const baseUrl = useContext(BaseUrlContext);
  console.log("Using backend at:", baseUrl);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [editingContext, setEditingContext] = useState({ planName: '', testcaseId: '', fieldName: '' });
  const [isSaving, setIsSaving] = useState(false);

  const { username, role } = useContext(AuthContext);

  const token = sessionStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetchTestSuites();
    fetchTestPlans();
    fetchPieChartData();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedSuites.length > 0) {
      fetchIdsForSuites(selectedSuites);
      setSelectedSuiteForTestRun(selectedSuites[0]);
    } else {
      setSuiteIds({});
      setSelectedSuiteForTestRun('');
    }
  }, [selectedSuites]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/users`, { headers });
      const data = await res.json();
      setAvailableUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchTestSuites = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/test-suites`, { headers });
      const data = await res.json();
      setAvailableSuites(data);
    } catch (err) {
      console.error('Error fetching test suites:', err);
    }
  };

  const fetchIdsForSuites = async (suites) => {
    try {
      const res = await fetch(`${baseUrl}/api/suite-ids?suites=${encodeURIComponent(suites.join(','))}`, { headers });
      const data = await res.json();
      setSuiteIds(data);
    } catch (err) {
      console.error('Error fetching IDs for suites:', err);
    }
  };

  const fetchTestPlans = async () => {
    try {
      let endpoint = (role === "admin" || role === "read")
        ? `${baseUrl}/api/test-plans`
        : `${baseUrl}/api/test-plans/user/${username}`;

      const res = await fetch(endpoint, { headers });
      const data = await res.json();

      setTestPlans(data.map(row => ({
        name: row.name,
        suites: row.test_suite
      })));
    } catch (err) {
      console.error('Error fetching test plans:', err);
    }
  };

  const fetchPieChartData = async (planName = null) => {
  try {
    const queryParams = new URLSearchParams();
    if (planName) queryParams.append("plan", planName);
    queryParams.append("role", role);
    if (role === "write") queryParams.append("username", username);

    const url = `${baseUrl}/api/test-plan-pie-data?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const data = await res.json();

    if (!res.ok) {
      console.error('[DEBUG] Server error response:', data?.error || 'Unknown error');
      setPieData(null);
      return;
    }

    if (!Array.isArray(data.statusData) || !Array.isArray(data.resultData)) {
      console.error('[DEBUG] Missing or invalid pie chart data format:', data);
      setPieData(null);
      return;
    }

    const transformedData = {
      ...data,
      statusData: data.statusData.map(item => ({
        status: item.status,
        count: parseInt(item.count, 10)
      })),
      resultData: data.resultData.map(item => ({
        test_result: item.test_result,
        count: parseInt(item.count, 10)
      }))
    };

    console.log('[DEBUG] Transformed Pie Chart Data:', transformedData);
    setPieData(transformedData);

  } catch (err) {
    console.error('Error fetching pie chart data:', err);
    setPieData(null);
  }
};


  const handleOpenForm = () => setShowForm(true);

  const handleCancel = () => {
    setShowForm(false);
    setPlanName('');
    setSelectedSuites([]);
    setNumTestRuns(0);
    setTestRuns([]);
    setSelectedSuiteForTestRun('');
  };

  const handleCreatePlan = async () => {
  if (!planName.trim() || selectedSuites.length === 0) {
      alert('Please enter a name and select at least one test suite.');
      return;
    }

    if (assignedUsers.length === 0 || assignedUsers.some(u => !u)) {
      alert('Please assign all testers.');
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/test-plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          testPlanName: planName,
          selectedSuites,
          assignedUsers, // 👈 updated from testRuns to assignedUsers
        })
      });

      const result = await res.json();
      if (!res.ok) return alert(`Failed to create test plan: ${result.error}`);
      
      alert(result.message);

      await fetchTestPlans();
      await fetchPieChartData();
      handleCancel();
    } catch (err) {
      console.error('Error creating test plan:', err);
      alert('Failed to create test plan due to a network error.');
    }
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setSelectedSuites(prev => checked ? [...prev, value] : prev.filter(s => s !== value));
  };

  const handleViewToggle = async (planName) => {
    if (openPlan === planName) {
      setOpenPlan(null);
      return;
    }

    try {
      const pieRes = await fetch(
        `${baseUrl}/api/test-plan-pie-data?plan=${encodeURIComponent(planName)}&role=${role}&username=${username}`,
        { headers }
      );
      if (!pieRes.ok) throw new Error("Pie chart fetch failed");
      const pieDataRaw = await pieRes.json();

      const transformedPieData = {
        ...pieDataRaw,
        statusData: pieDataRaw.statusData.map(item => ({
          status: item.status,
          count: parseInt(item.count, 10),
        })),
        resultData: pieDataRaw.resultData.map(item => ({
          test_result: item.test_result,
          count: parseInt(item.count, 10),
        })),
      };
      setPieData(transformedPieData);
    } catch (err) {
      console.error("Failed to fetch pie data:", err);
      setPieData(null);
    }

    if (!planTestCases[planName]) {
      try {
        let endpoint = (role === "admin" || role === "read")
          ? `${baseUrl}/api/test-plan/${planName}`
          : `${baseUrl}/api/test-plan/${planName}/user/${username}`;
        const res = await fetch(endpoint, { headers });
        const data = await res.json();
        setPlanTestCases(prev => ({ ...prev, [planName]: data }));
      } catch (err) {
        alert("Could not fetch test cases for " + planName);
      }
    }

    setOpenPlan(planName);
  };

  const handleFieldChange = (plan, testCaseId, field, value) => {
    if (field === 'actual_result' && value.length > 1000) return alert('Actual result should be < 1000 chars');
    if (field === 'comments' && value.length > 500) return alert('Comment should be < 500 chars');

    setPlanTestCases(prev => ({
      ...prev,
      [plan]: prev[plan].map(row =>
        row.testcase_id === testCaseId ? { ...row, [field]: value } : row
      )
    }));

    setEditedRows(prev => ({
      ...prev,
      [plan]: {
        ...(prev[plan] || {}),
        [testCaseId]: {
          ...(prev[plan]?.[testCaseId] || {}),
          [field]: value
        }
      }
    }));
  };

  const [selectedBug, setSelectedBug] = useState(null);
  const [bugDetails, setBugDetails] = useState(null);
  const statusOptions = ['Open', 'Closed', 'Retesting'];
  const uniqueOptions =
    bugDetails && bugDetails.status
      ? [bugDetails.status, ...statusOptions.filter(s => s !== bugDetails.status)]
      : statusOptions;

  const handleBugClick = async (bugId, testcaseId, testPlanName) => {
    try {
      const res = await fetch(
        `${baseUrl}/api/bugs/${bugId}?testcase_id=${testcaseId}&test_plan_name=${encodeURIComponent(testPlanName)}`
      );
      const data = await res.json();
      setBugDetails(data);
      setSelectedBug(bugId);
    } catch (err) {
      console.error('Failed to fetch bug details:', err);
    }
  };

  const closeModal = () => {
    setSelectedBug(null);
    setBugDetails(null);
  };


  /*const handleSaveChanges = async (planName) => {
    const updates = editedRows[planName];
    if (!updates || Object.keys(updates).length === 0) {
      alert('No changes to save.');
      return;
    }

    setIsSaving(true);
    let successCount = 0, errorCount = 0;

    await Promise.all(
      Object.entries(updates).map(async ([testcaseId, changes]) => {
        try {
          const res = await fetch(
            `${baseUrl}/api/test-plan/${planName}/${testcaseId}`,
            { method: 'PUT', headers, body: JSON.stringify(changes) }
          );
          if (!res.ok) throw new Error();
          successCount++;
        } catch {
          errorCount++;
        }
      })
    );

    if (errorCount === 0) alert(`Successfully saved ${successCount} changes.`);
    else alert(`Saved ${successCount}, ${errorCount} failed.`);

    setEditedRows(prev => {
      const newEdits = { ...prev };
      if (errorCount === 0) delete newEdits[planName];
      return newEdits;
    });

    await fetchTestPlans();
    if (pieData?.testPlanName === planName) await fetchPieChartData(planName);
    setIsSaving(false);
  };
  */

  const handleDeletePlan = async () => {
    const planToDelete = prompt("Enter the exact name of the test plan to delete:");
    if (!planToDelete || !window.confirm(`Are you sure you want to delete "${planToDelete}"?`)) return;

    try {
      const res = await fetch(`${baseUrl}/api/test-plan/${encodeURIComponent(planToDelete)}`, {
        method: 'DELETE', headers
      });

      const result = await res.json();
      if (!res.ok) return alert(`Failed: ${result.error}`);
      alert(result.message);

      await fetchTestPlans();
      await fetchPieChartData();
      if (openPlan === planToDelete) setOpenPlan(null);
    } catch (err) {
      console.error('Error deleting test plan:', err);
      alert('Network error.');
    }
  };

  const statusColors = {
    'new': '#FF6B6B',
    'in progress': '#4ECDC4',
    'completed': '#2ECC71',
    'needs-retest': '#F39C12'
  };

  const resultColors = {
    'not-tested': '#95A5A6',
    'pass': '#27AE60',
    'fail': '#E74C3C'
  };

 return (
    <div className="master-table-container">
      <h1>TEST PLANS</h1>

      {/* ADMIN Buttons */}
      {role === 'admin' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <PermissibleButton className="action-button" onClick={handleOpenForm}>CREATE TEST PLAN</PermissibleButton>
          <PermissibleButton className="delete-btn" onClick={handleDeletePlan}>DELETE TEST PLAN</PermissibleButton>
        </div>
      )}

      {/* FORM SECTION */}
      {showForm && (
        <PermissibleForm className="test-plan-form">
          <h2>Create New Test Plan</h2>
          <label>Test Plan Name</label>
          <PermissibleInput
            type="text"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            placeholder="Enter test plan name"
          />

          <label>Select Test Suites</label>
          <div className="checkbox-group">
            {availableSuites.map((suite) => (
              <label key={suite}>
                <PermissibleCheckbox
                  value={suite}
                  checked={selectedSuites.includes(suite)}
                  onChange={handleCheckboxChange}
                />
                {suite}
              </label>
            ))}
          </div>

          {selectedSuites.length > 0 && (
            <>
              <label>Number of Testers</label>
              <PermissibleInput
                type="number"
                min="1"
                value={numTesters}
                onChange={(e) => {
                  const count = parseInt(e.target.value, 10) || 0;
                  setNumTesters(count);
                  setAssignedUsers(Array.from({ length: count }, () => ''));
                }}
              />

                {numTesters > 0 && (
                <div className="tester-selection-group">
                  <label>Assign Testers</label>
                  {assignedUsers.map((userId, index) => (
                    <PermissibleSelect
                    key={index}
                    value={userId}
                    onChange={(e) => {
                      const updated = [...assignedUsers];
                      updated[index] = e.target.value;
                      setAssignedUsers(updated);
                    }}
                  >
                    <option value="">Select User</option>
                    {availableUsers.map((user) => (
                      <option key={user.emp_id} value={user.username}>{user.username}</option>
                    ))}
                  </PermissibleSelect>
                  ))}
                </div>
              )}     
            </>
          )}

          <div className="button-group">
            <PermissibleButton className="create-btn" onClick={handleCreatePlan}>Create</PermissibleButton>
            <PermissibleButton className="cancel-btn" onClick={handleCancel}>Cancel</PermissibleButton>
          </div>
        </PermissibleForm>
      )}

      {/* PIE CHART SECTION */}
      {Array.isArray(pieData?.statusData) && pieData.statusData.length > 0 && (
        <div className="pie-chart-container">
          <h3>Current Test Plan: {pieData.testPlanName}</h3>
          <div className="charts">
            <div className="chart-section">
              <h4>Test Case Status Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData.statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, count }) => `${name || ''}: ${count}`}
                  >
                    {pieData.statusData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={statusColors[entry.status] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h4>Test Result Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData.resultData}
                    dataKey="count"
                    nameKey="test_result"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, count }) => `${name || ''}: ${count}`}
                  >
                    {pieData.resultData.map((entry, index) => (
                      <Cell key={`result-${index}`} fill={resultColors[entry.test_result] || '#82ca9d'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR BUG */}
      {selectedBug && bugDetails && (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h2>Bug #{selectedBug}</h2>
      <p><strong>Title:</strong> {bugDetails.title}</p>
      <p><strong>Severity:</strong> {bugDetails.severity}</p>
      <p><strong>Description:</strong> {bugDetails.description}</p>

      <p><strong>Status:</strong></p>
      <select
        value={bugDetails.status || ''}
        onChange={async (e) => {
          const newStatus = e.target.value;

          // Debug logs
          console.log("DEBUG - Bug Details (Modal):", {
            selectedBug,
            testcase_id: bugDetails.testcase_id,
            test_plan_name: bugDetails.test_plan_name,
            newStatus,
          });

          try {
            const res = await fetch(`${baseUrl}/api/bug-status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                // Uncomment below if your backend needs token
                // Authorization: `Bearer ${sessionStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                bug_id: selectedBug,
                testcase_id: bugDetails.testcase_id,
                test_plan_name: bugDetails.test_plan_name,
                status: newStatus,
              }),
            });

            if (!res.ok) {
              const error = await res.json();
              console.error("❌ Error response from server:", error);
              throw new Error(error.error || 'Failed to update status');
            }

            const data = await res.json();
            console.log("✅ Bug status update success:", data);

            setBugDetails((prev) => ({ ...prev, status: newStatus }));
          } catch (error) {
            alert(`❌ Error updating bug status: ${error.message}`);
            console.error("Exception caught:", error);
          }
        }}
      >
        {uniqueOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <button onClick={closeModal} className="close-button">Close</button>
    </div>
  </div>
)}

      {/* TEST PLAN LIST */}
      {testPlans.map((plan, index) => (
        <div key={index} className="test-suite-group">
          <button className="dropdown-toggle" onClick={() => handleViewToggle(plan.name)}>
            {plan.name} — [{Array.isArray(plan.suites) ? plan.suites.join(', ') : 'No Suites'}]
          </button>

          {openPlan === plan.name && (
            <div className="plan-details">
              {planTestCases[plan.name]?.length > 0 ? (
                <table className="test-case-table">
                    <thead>
                    <tr>
                      <th>TEST SCENARIO ID</th>
                      <th>TEST SUMMARY</th>
                      <th>TESTCASE ID</th>
                      <th>TEST RESULT</th>
                      <th>STATUS</th>
                      <th>COMMENTS</th>
                      <th>EXECUTED BY</th>
                      <th>BUG ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planTestCases[plan.name].map((row, i) => (
                      <tr key={i}>
                        <td>{row.test_scenario_id}</td>
                        <td>{row.test_scenario}</td>
                        <td>
                          <a href={`/testcase/${plan.name}/${row.testcase_id}`} style={{ color: '#3498db', textDecoration: 'underline' }}>
                            {row.testcase_id}
                          </a>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: resultColors[row.test_result || 'not-tested'],
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}>
                            {row.test_result || 'not-tested'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: statusColors[row.status || 'new'],
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}>
                            {row.status || 'new'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'pre-line' }}>{row.comments || '-'}</td>
                        <td>{row.executed_by || '-'}</td>
                        <td>
                          {row.bug_id ? (
                            <button
                            onClick={() => handleBugClick(row.bug_id, row.testcase_id, plan.name)}
                            className="bug-id-link"
                          >
                            {row.bug_id}
                          </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No test cases found in this plan.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TestPlan;