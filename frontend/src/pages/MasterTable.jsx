import React, { useEffect, useState , useContext} from 'react';
import '../css/MasterTable.css';
import { useNavigate } from 'react-router-dom';
import { BaseUrlContext } from '../context/BaseUrlContext';
import ExcelToCSVUpload from '../components/ExcelToCSVUpload';

const MasterTable = () => {
  const [testCases, setTestCases] = useState([]);
  const [groupedTestCases, setGroupedTestCases] = useState({});
  const [openSuite, setOpenSuite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseUrl = useContext(BaseUrlContext);

  const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('TEXT');
  const navigate = useNavigate();

  const token = sessionStorage.getItem('token');

  const submitAddColumn = async () => {
    if (!newColumnName.trim()) {
      return alert('Please enter a column name.');
    }

    try {
      const res = await fetch(`${baseUrl}/api/add-column`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ columnName: newColumnName, columnType: newColumnType })
      });

      if (!res.ok) throw new Error('Failed to add column');
      alert('Column added successfully. Refresh to see changes.');
      setNewColumnName('');
      setNewColumnType('TEXT');
      setShowAddColumnForm(false);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteColumn = async () => {
    const columnName = prompt('Enter column name to delete:');
    if (!columnName) return;

    try {
      const res = await fetch(`${baseUrl}/api/delete-column`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ columnName })
      });

      if (!res.ok) throw new Error('Failed to delete column');
      alert('Column deleted successfully. Refresh the page to see changes.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${baseUrl}/api/test-cases`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON - received HTML instead');
      }

      const data = await response.json();
      setTestCases(data);

      const grouped = data.reduce((acc, testCase) => {
        const suite = testCase.test_suite || 'Uncategorized';
        if (!acc[suite]) acc[suite] = [];
        acc[suite].push(testCase);
        return acc;
      }, {});
      setGroupedTestCases(grouped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCases();
  }, []);

  const toggleSuite = (suite) => {
    setOpenSuite(openSuite === suite ? null : suite);
  };

  if (loading) {
    return <div className="master-table-container">Loading test cases...</div>;
  }

  if (error) {
    return (
      <div className="master-table-container">
        <h1>MASTER TABLE</h1>
        <div className="error-message">
          <p>Error loading test cases: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="master-table-container">
      <h1>MASTER TABLE</h1>

      <div className="buttons" style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="action-button" onClick={() => setShowAddColumnForm(!showAddColumnForm)}>
          {showAddColumnForm ? 'Cancel Add Column' : 'Add Column'}
        </button>
        <button className="action-button" onClick={handleDeleteColumn}>
          Delete Column
        </button>
        <button className="action-button" onClick={() => navigate('/add-test-case')}>
          Add Test Case
        </button>
      </div>

      <div>
        <ExcelToCSVUpload 
          uploadUrl={`${baseUrl}/upload-csv`}
          tableName="master_table"
          token={token} // Pass token if needed inside the component
          onUploadSuccess={() => {
            alert('Upload succeeded!');
            fetchTestCases(); // Refresh the table after upload
          }}
          onUploadError={(e) => alert('Upload failed: ' + e.message)}
        />
      </div>

      {showAddColumnForm && (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Column Name"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            style={{ marginRight: '10px', padding: '5px' }}
          />
          <select
            value={newColumnType}
            onChange={(e) => setNewColumnType(e.target.value)}
            style={{ marginRight: '10px', padding: '5px' }}
          >
            <option value="TEXT">TEXT</option>
            <option value="INTEGER">INTEGER</option>
            <option value="BOOLEAN">BOOLEAN</option>
            <option value="DATE">DATE</option>
            <option value="TIMESTAMP">TIMESTAMP</option>
          </select>
          <button className="action-button" onClick={submitAddColumn}>Submit</button>
        </div>
      )}

      {Object.entries(groupedTestCases).map(([suite, testCases]) => (
        <div key={suite} className="test-suite-group">
          <button className="dropdown-toggle" onClick={() => toggleSuite(suite)}>
            {suite} ({testCases.length})
          </button>
          {openSuite === suite && (
            <table className="test-case-table">
              <thead>
                <tr>
                  {testCases.length > 0 &&
                    Object.keys(testCases[0]).map((key) => (
                      <th key={key}>{key.replace(/_/g, ' ')}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc, i) => (
                  <tr key={i}>
                    {Object.values(tc).map((value, idx) => (
                      <td key={idx}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
};

export default MasterTable;
