import dotenv from 'dotenv';
dotenv.config();
import React from 'react';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import ReactDOMServer from 'react-dom/server';
import LoginCredentials from './emails/LoginCredentials.jsx';
import { parse } from 'csv-parse/sync';
import cookieParser from 'cookie-parser';
import { authenticateToken, authorizeRoles } from './middleware/authMiddleware.js';
import getEmbedding from './utils/getEmbedding.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cookieParser());
const PORT = process.env.PORT || 5000;

//API key for Resend
const resend = new Resend(process.env.RESEND_API_KEY);



app.use(cors({
  origin: true,
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'FinalDb',
  password: process.env.DB_PASS || 'hello123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));

// API Routes

// ==================== MASTER-TABLE PAGE=====================

// Get all test suites
app.get('/api/test-suites', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT test_suite FROM master_table WHERE test_suite IS NOT NULL');
    const suites = result.rows.map(row => row.test_suite);
    res.json(suites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch test suites' });
  }
});

// Get all test cases
app.get('/api/test-cases', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM master_table');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching test cases', error: error.message });
  }
});


// Get all test plans
app.get('/api/test-plans', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testplan_registry ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching test plans:', err);
    res.status(500).json({ error: 'Failed to fetch test plans' });
  }
});

// Get test cases for a specific test plan
app.get('/api/test-plan/:name', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  const testplanName = req.params.name;

  try {
    const registryResult = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1 LIMIT 1',
      [testplanName]
    );

    if (registryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const registryId = registryResult.rows[0].id;

    const testcases = await pool.query(
      'SELECT * FROM testplans WHERE registry_id = $1 ORDER BY testcase_id ASC',
      [registryId]
    );

    res.json(testcases.rows);
  } catch (err) {
    console.error(`Error fetching data from test plan '${testplanName}':`, err);
    res.status(500).json({ error: `Failed to fetch data from ${testplanName}` });
  }
});


// Update test case in a test plan
/*app.put('/api/test-plan/:plan/:id', authenticateToken, authorizeRoles('admin','write'), async (req, res) => {
  const { plan: testplanName, id: testcaseId } = req.params;
  const { test_result, status, actual_result, comments } = req.body;

  try {
    // 1. Get the registry_id of the test plan
    const registryResult = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1 LIMIT 1',
      [testplanName]
    );

    if (registryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const registryId = registryResult.rows[0].id;

    // 2. Update the test case matching both testcase_id and registry_id
    const result = await pool.query(
      `UPDATE testplans SET 
         test_result = COALESCE($1, test_result),
         status = COALESCE($2, status),
         actual_result = COALESCE($3, actual_result),
         comments = COALESCE($4, comments)
       WHERE testcase_id = $5 AND registry_id = $6
       RETURNING *`,  
      [test_result, status, actual_result, comments, testcaseId, registryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found for this plan' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Failed to update test case:', err.message);
    res.status(500).json({ error: 'Failed to update test case' });
  }
});
*/

// Check if master_table exists
app.get('/api/check-table', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'master_table'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      const countResult = await pool.query('SELECT COUNT(*) FROM master_table');
      const rowCount = parseInt(countResult.rows[0].count);
      
      res.json({
        tableExists,
        rowCount
      });
    } else {
      res.json({
        tableExists,
        rowCount: 0
      });
    }
  } catch (error) {
    console.error('Error checking table:', error);
    res.status(500).json({ error: error.message });
  }
});
//======================================================================================================================================================================
//=====================================================================Add Test Case Routes=====================================================================================
//=====================================================================================================================================================================

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Logging middleware at the top
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Utility function to generate next test_scenario_id per suite
async function generateNextScenarioId(suite) {
  try {
    const formattedSuite = suite.charAt(0).toUpperCase() + suite.slice(1).toLowerCase();
    const prefix = `TS_${formattedSuite}`;
    const likePattern = `${prefix}_%`;

    const result = await pool.query(
      'SELECT test_scenario_id FROM master_table WHERE test_suite = $1 AND test_scenario_id LIKE $2 ORDER BY s_no DESC LIMIT 1',
      [suite, likePattern]
    );

    if (result.rows.length === 0) {
      return `${prefix}_001`;
    } else {
      const lastId = result.rows[0].test_scenario_id;
      const match = lastId.match(/_(\d+)$/);
      const nextNumber = match ? parseInt(match[1]) + 1 : 1;
      return `${prefix}_${String(nextNumber).padStart(3, '0')}`;
    }
  } catch (err) {
    console.error("❌ Error generating scenario ID:", err);
    throw err;
  }
}

// ✅ Create new test case with logging
app.post('/api/testcases', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    console.log("\n================ NEW TEST CASE SUBMISSION ================\n");

    // Log full incoming body
    console.log("📥 FULL REQUEST BODY:", JSON.stringify(req.body, null, 2));

    const {
      test_scenario,
      testcase_description,
      prerequisite,
      steps_to_reproduce,
      expected_result,
      actual_result,
      test_result = 'not-tested',
      status = 'new',
      comments,
      test_suite
    } = req.body;

    // Log raw field values
    console.log("📌 Raw Fields:");
    console.log("test_scenario:", test_scenario);
    console.log("test_suite:", test_suite);

    // Trim and normalize
    const trimmedScenario = test_scenario?.trim().toLowerCase();
    const trimmedSuite = test_suite?.trim().toLowerCase();

    console.log("🔍 Checking for duplicate with:", trimmedScenario, trimmedSuite);

    const duplicateCheckQuery = `
      SELECT 1 FROM master_table 
      WHERE LOWER(TRIM(test_scenario)) = $1 AND LOWER(TRIM(test_suite)) = $2 
      LIMIT 1
    `;
    const duplicateCheck = await pool.query(duplicateCheckQuery, [trimmedScenario, trimmedSuite]);

    console.log("🧪 DUPLICATE CHECK RESULT:", duplicateCheck.rows);

    if (duplicateCheck.rows.length > 0) {
      console.warn("⚠️ Duplicate test case detected:", duplicateCheck.rows[0]);
      return res.status(409).json({ error: 'Test case already exists for this suite.' });
    }

    // Let triggers generate test_scenario_id & testcase_id
    // If you still want to generate test_scenario_id manually:
    const test_scenario_id = await generateNextScenarioId(test_suite);

    const insertQuery = `
      INSERT INTO master_table (
        test_scenario_id, test_scenario, testcase_description, prerequisite,
        steps_to_reproduce, expected_result, actual_result,
        test_result, status, comments, test_suite
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `;

    const values = [
      test_scenario_id,
      test_scenario,
      testcase_description,
      prerequisite,
      steps_to_reproduce,
      expected_result,
      actual_result,
      test_result,
      status,
      comments,
      test_suite
    ];

    console.log("📦 INSERT VALUES:", values);
    console.log("📜 INSERT QUERY:", insertQuery);

    const result = await pool.query(insertQuery, values);

    console.log("✅ INSERTED TEST CASE:", result.rows[0]);
    res.json(result.rows[0]);

    console.log("\n================= END OF SUBMISSION =================\n");

  } catch (err) {
    console.error("❌ ERROR OBJECT:", err);
    console.error("🧨 Error Code:", err.code);
    console.error("🧨 Error Message:", err.message);
    console.error("🧨 Error Stack:", err.stack);

    if (err.code === '23505') {
      return res.status(409).json({ error: 'Test case already exists (unique constraint).' });
    }

    res.status(500).json({ error: "Server error while inserting test case" });
  }
});

//Write Users add testcase

  app.post('/api/submit-test-case', authenticateToken, authorizeRoles('write'), async (req, res) => {
  try {
    console.log("\n=========== WRITE USER SUBMITTING TEST CASE (PENDING) ===========\n");

    console.log("📥 FULL REQUEST BODY:", JSON.stringify(req.body, null, 2));

    const {
      test_scenario,
      testcase_description,
      prerequisite,
      steps_to_reproduce,
      expected_result,
      comments,
      test_suite
    } = req.body;

    const username = req.user.username;

    // Trim and normalize for duplicate checking
    const trimmedScenario = test_scenario?.trim().toLowerCase();
    const trimmedSuite = test_suite?.trim().toLowerCase();

    console.log("🔍 Checking for duplicate pending case:", trimmedScenario, trimmedSuite);

    const duplicateCheckQuery = `
      SELECT 1 FROM pending_requests 
      WHERE LOWER(TRIM(test_scenario)) = $1 AND LOWER(TRIM(test_suite)) = $2
      LIMIT 1
    `;
    const duplicateCheck = await pool.query(duplicateCheckQuery, [trimmedScenario, trimmedSuite]);

    if (duplicateCheck.rows.length > 0) {
      console.warn("⚠️ Duplicate pending request detected.");
      return res.status(409).json({ error: 'Test case already submitted for review.' });
    }

    const insertQuery = `
      INSERT INTO pending_requests (
        test_scenario,
        testcase_description,
        prerequisite,
        steps_to_reproduce,
        expected_result,
        comments,
        test_suite,
        submitted_by,
        status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
      RETURNING *;
    `;

    const values = [
      test_scenario,
      testcase_description,
      prerequisite,
      steps_to_reproduce,
      expected_result,
      comments,
      test_suite,
      username,
    ];

    const result = await pool.query(insertQuery, values);

    console.log("✅ PENDING TEST CASE SUBMITTED:", result.rows[0]);
    res.status(200).json({ message: 'Submitted for admin approval.', data: result.rows[0] });

    console.log("\n================== END SUBMISSION ==================\n");

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Error while submitting test case request" });
  }
});

//access pending requests for admin
app.get('/api/pending-requests/admin', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT test_scenario_id, test_scenario, testcase_id, test_result, status, comments, submitted_by, request_status
        FROM pending_requests
        ORDER BY submitted_at DESC
      `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// -----------------------------------------
// 3. GET ONE REQUEST BY ID (admin only)
// -----------------------------------------
app.get('/api/pending-requests/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM pending_requests WHERE testcase_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching request by ID:', err);
    res.status(500).json({ error: 'Could not fetch request details' });
  }
});

// -----------------------------------------
// 4. UPDATE FIELDS IN REQUEST (admin only)
// -----------------------------------------
app.put('/api/pending-requests/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['actual_result', 'test_result', 'status', 'comments'];

    const updates = [];
    const values = [];
    let i = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${i}`);
        values.push(req.body[field]);
        i++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE pending_requests
      SET ${updates.join(', ')}
      WHERE testcase_id = $${i}
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating pending request:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// -----------------------------------------
// 5. Pending requests Approved (admin only)
// -----------------------------------------
app.post(
  '/api/pending-requests/:id/approve',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const { rows } = await pool.query(
        'SELECT * FROM pending_requests WHERE testcase_id = $1 AND request_status = $2',
        [id, 'pending']
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'No pending request found or already processed.' });
      }

      const test = rows[0];
      await pool.query(
        `INSERT INTO master_table (
          test_scenario,
          testcase_description,
          prerequisite,
          steps_to_reproduce,
          expected_result,
          actual_result,
          test_result,
          status,
          comments,
          test_suite
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          test.test_scenario,
          test.testcase_description,
          test.prerequisite,
          test.steps_to_reproduce,
          test.expected_result,
          test.actual_result,
          test.test_result,
          test.status,
          test.comments,
          test.test_suite
        ]
      );
      await pool.query(
        `UPDATE pending_requests SET request_status = 'approved' WHERE testcase_id = $1`,
        [id]
      );

      res.json({ message: 'Request approved and added to master table.' });
    } catch (err) {
      console.error('Approval error:', err);
      res.status(500).json({ error: 'Failed to approve request.' });
    }
  }
);



// -----------------------------------------
// 6. Pending requests Rejected (admin only)
// -----------------------------------------
app.post('/api/pending-requests/:id/reject', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE pending_requests SET request_status = 'rejected' WHERE testcase_id = $1 AND request_status = 'pending' RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed.' });
    }

    res.json({ message: 'Request rejected.' });
  } catch (err) {
    console.error('Rejection error:', err);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
});

// -------------------------------------------------
// 1. View Request Status , My Requests (write only)
// --------------------------------------------------

// 1. View Request Status (write only)
app.get('/api/pending-request/user', 
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM pending_requests WHERE submitted_by = $1 ORDER BY submitted_at DESC',
        [req.user.username]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to fetch user requests.' });
    }
  }
);

// 2. GET ONE REQUEST BY ID (write only)
app.get('/api/pending-request/:testcaseId', 
  authenticateToken,
  authorizeRoles('write'),
  async (req, res) => {
    const { testcaseId } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM pending_requests WHERE testcase_id = $1 AND submitted_by = $2',
        [testcaseId, req.user.username] // Security: user can only access their own
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching request:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// -----------------------------------------
// 3. Update ONE REQUEST BY ID (write only)
// -----------------------------------------
app.put('/api/pending-request/:testcaseId', authenticateToken, authorizeRoles('write'), async (req, res) => {
  const { testcaseId } = req.params;
  const { expected_result, status, test_result, comments } = req.body;

  try {
    const current = await pool.query('SELECT status FROM pending_requests WHERE testcase_id = $1', [testcaseId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (current.rows[0].status === 'approved') {
      return res.status(403).json({ error: 'Cannot modify an approved request' });
    }

    const fieldsToUpdate = [];
    const values = [];
    let index = 1;

    if (expected_result !== undefined) {
      fieldsToUpdate.push(`expected_result = $${index++}`);
      values.push(expected_result);
    }
    if (status !== undefined) {
      fieldsToUpdate.push(`status = $${index++}`);
      values.push(status);
    }
    if (test_result !== undefined) {
      fieldsToUpdate.push(`test_result = $${index++}`);
      values.push(test_result);
    }
    if (comments !== undefined) {
      fieldsToUpdate.push(`comments = $${index++}`);
      values.push(comments);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(testcaseId); // For WHERE clause

    const query = `
      UPDATE pending_requests
      SET ${fieldsToUpdate.join(', ')}
      WHERE testcase_id = $${index}
    `;

    await pool.query(query, values);

    res.json({ message: 'Request updated successfully' });
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get pie chart data for latest test plan
app.get('/api/test-plan-pie-data', authenticateToken, authorizeRoles('admin', 'write', 'read'), async (req, res) => {
  try {
    let { plan, role, username } = req.query;

    let registryQuery = null;

    // 1. Get latest relevant plan
    if (!plan) {
      if (role === 'write') {
        registryQuery = await pool.query(
          `SELECT id, name, assigned_users FROM testplan_registry
           WHERE $1 = ANY(assigned_users)
           ORDER BY created_at DESC
           LIMIT 1`,
          [username]
        );
      } else {
        registryQuery = await pool.query(
          `SELECT id, name, assigned_users FROM testplan_registry
           ORDER BY created_at DESC
           LIMIT 1`
        );
      }
    } else {
      registryQuery = await pool.query(
        `SELECT id, name, assigned_users FROM testplan_registry
         WHERE name = $1`,
        [plan]
      );
    }

    if (!registryQuery || registryQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No test plan found' });
    }

    const registryId = registryQuery.rows[0].id;
    const planName = registryQuery.rows[0].name;
    const assignedUsers = registryQuery.rows[0].assigned_users || [];

    // 2. For write users, double-check they're assigned
    if (role === 'write') {
      const isAssigned = Array.isArray(assignedUsers) && assignedUsers.includes(username);
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this test plan.' });
      }
    }

    // 3. Fetch distributions (no assigned_to filtering anymore)
    const statusDist = await pool.query(
      `SELECT status, COUNT(*) FROM testplans
       WHERE registry_id = $1
       GROUP BY status`,
      [registryId]
    );

    const resultDist = await pool.query(
      `SELECT test_result, COUNT(*) FROM testplans
       WHERE registry_id = $1
       GROUP BY test_result`,
      [registryId]
    );

    res.json({
      testPlanName: planName,
      statusData: statusDist.rows,
      resultData: resultDist.rows
    });

  } catch (err) {
    console.error('Error fetching pie chart data:', err);
    res.status(500).json({ error: 'Failed to load pie chart data' });
  }
});


// Add column to master_table
app.post('/api/add-column', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { columnName, columnType } = req.body;
  if (!columnName || !columnType) {
    return res.status(400).json({ message: 'Column name and type are required' });
  }

  const validTypes = ['TEXT', 'INTEGER', 'BOOLEAN', 'DATE', 'TIMESTAMP'];
  if (!validTypes.includes(columnType.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid column type' });
  }

  try {
    await pool.query(`ALTER TABLE master_table ADD COLUMN "${columnName}" ${columnType.toUpperCase()}`);
    res.json({ message: 'Column added successfully' });
  } catch (err) {
    console.error('Error adding column:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete column from master_table
app.post('/api/delete-column',authenticateToken, authorizeRoles('admin'),  async (req, res) => {
  const { columnName } = req.body;
  if (!columnName) return res.status(400).json({ message: 'Column name is required' });

  try {
    await pool.query(`ALTER TABLE master_table DROP COLUMN "${columnName}"`);
    res.json({ message: 'Column deleted successfully' });
  } catch (err) {
    console.error('Error deleting column:', err);
    res.status(500).json({ error: err.message });
  }
});

//=========================================================================================================================================================================
//======================================================================JOHAAN'S ROUTES ===================================================================================
//=========================================================================================================================================================================


// ==================== USER MANAGEMENT ROUTES ====================

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT username, password, email, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create JWT token (client will store this in sessionStorage)
    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Send the token and user info in response (not setting a cookie)
    res.json({
      message: 'Login successful',
      token, // store this in sessionStorage on client
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Add new user
app.post('/add-users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { username, email, role, password } = req.body;

  if (!username || !email || !role || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, role, password) VALUES ($1, $2, $3, $4)',
      [username, email, role, hashedPassword]
    );

    // Send email with credentials (commented out as React component would need to be adapted)
    
    const emailHtml = ReactDOMServer.renderToStaticMarkup(
    <LoginCredentials username={username} password={password} />
    );

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Welcome to MiPhi!',
      html: emailHtml,
    });
    
    
    res.status(201).json({ message: 'User added successfully' });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all users (excluding admin)
app.get('/list-users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users where emp_id != 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
app.put('/list-users/:emp_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { emp_id } = req.params;
  const { username, email, role } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, role = $3 WHERE emp_id = $4 RETURNING *',
      [username, email, role, emp_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
app.delete('/list-users/:emp_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { emp_id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE emp_id = $1 RETURNING *', [emp_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin profile
app.get('/profile', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await pool.query(
      'SELECT username, email FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/change-password', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.user.username; // 👈 use from token

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const userResult = await pool.query(
      'SELECT password FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, username]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


//=============================================================================PROFILE ENDS===========================================================================================


//To fetch users with 'write' role for the create test plan dropdown
app.get('/api/users', authenticateToken, authorizeRoles('admin','write','read'), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE role = 'write'");
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new test plan
app.post('/api/test-plan', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { testPlanName, selectedSuites, assignedUsers } = req.body;

  if (!testPlanName || !Array.isArray(selectedSuites) || selectedSuites.length === 0 || !Array.isArray(assignedUsers)) {
    return res.status(400).json({ error: 'Test plan name, assigned users, and at least one test suite are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into testplan_registry (store assigned users as text[])
    const insertRegistryRes = await client.query(
      `INSERT INTO testplan_registry (name, test_suite, assigned_users)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [testPlanName, selectedSuites, assignedUsers]
    );

    const registryId = insertRegistryRes.rows[0].id;

    // 2. Fetch relevant test cases from master_table
    const masterCases = await client.query(
      `SELECT test_scenario_id, test_scenario, testcase_id, testcase_description,
              prerequisite, steps_to_reproduce, expected_result, test_suite
       FROM master_table
       WHERE test_suite = ANY($1)`,
      [selectedSuites]
    );

    const insertPromises = [];

    for (const testCase of masterCases.rows) {
      insertPromises.push(client.query(
        `INSERT INTO testplans (
          registry_id, test_scenario_id, test_scenario, testcase_id, testcase_description,
          prerequisite, steps_to_reproduce, expected_result, actual_result,
          test_result, status, comments, test_suite
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, '', 'not-tested', 'new', '', $9
        )`,
        [
          registryId,
          testCase.test_scenario_id,
          testCase.test_scenario,
          testCase.testcase_id,
          testCase.testcase_description,
          testCase.prerequisite,
          testCase.steps_to_reproduce,
          testCase.expected_result,
          testCase.test_suite
        ]
      ));
    }

    await Promise.all(insertPromises);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Test plan created successfully.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating test plan:', err);
    res.status(500).json({ error: 'Failed to create test plan.' });
  } finally {
    client.release();
  }
});

//route to delete a test plan

app.delete('/api/test-plan/:name', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const planName = req.params.name;

  try {
    
    // 1. Fetch the registry_id for the plan name
    const registryResult = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1 LIMIT 1',
      [planName]
    );
    if (registryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test plan not found' });
    }
    const registryId = registryResult.rows[0].id;

    await pool.query(`DELETE FROM testplans WHERE registry_id = $1`, [registryId]);

    await pool.query(`DELETE FROM testplan_registry WHERE id = $1`, [registryId]);

    res.json({ message: `Test plan '${req.params.name}' deleted successfully.` });
  } catch (err) {
    console.error(`Error deleting test plan '${tableName}':`, err);
    res.status(500).json({ error: `Failed to delete test plan '${req.params.name}'` });
  }
});

// fetch suit name for the dropdown menu in the test plan page
// --- GET SUITE IDS ---
app.get('/api/suite-ids', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const suitesParam = req.query.suites;
  if (!suitesParam) return res.status(400).json({ error: 'Missing suites parameter' });

  // Split comma-separated suites param into array
  const suiteNames = suitesParam.split(',');

  try {
    // Use a parameterized query with WHERE test_suite = ANY($1)
    const { rows } = await pool.query(
      `SELECT test_suite, test_scenario_id FROM master_table WHERE test_suite = ANY($1::text[]) ORDER BY test_suite, test_scenario_id`,
      [suiteNames]
    );

    // Group IDs by suite name
    const result = {};
    for (const suite of suiteNames) {
      result[suite] = [];
    }
    for (const row of rows) {
      if (!result[row.test_suite]) result[row.test_suite] = [];
      result[row.test_suite].push(row.test_scenario_id);
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching suite IDs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//fetching testplans for write users
// GET all test plans where the user is listed in assigned_users array
app.get('/api/test-plans/user/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, test_suite
       FROM testplan_registry
       WHERE $1 = ANY(assigned_users)
       ORDER BY name ASC`,
      [username]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user-specific test plans:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch test plans assigned to a specific user
// GET test cases for a user in a given plan
app.get('/api/test-plan/:name/user/:username', async (req, res) => {
  const { name: planName, username } = req.params;

  try {
    // 1. Get registry record and check access
    const registryRes = await pool.query(
      `SELECT id FROM testplan_registry
       WHERE name = $1 AND $2 = ANY(assigned_users)
       LIMIT 1`,
      [planName, username]
    );

    if (registryRes.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or test plan not found' });
    }

    const registryId = registryRes.rows[0].id;

    // 2. Get all test cases under that plan (user is allowed to see all cases now)
    const testCasesRes = await pool.query(
      `SELECT * FROM testplans
       WHERE registry_id = $1
       ORDER BY test_scenario_id ASC`,
      [registryId]
    );

    res.json(testCasesRes.rows);
  } catch (err) {
    console.error('Error fetching test cases for user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//csv upload route

app.post('/upload-csv', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { tableName, csvData, testSuite } = req.body;

  if (!tableName || !csvData) {
    return res.status(400).json({ error: 'Missing tableName or csvData' });
  }

  try {
    let records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV data is empty' });
    }

  const headerAlternatives = {
    s_no: [
      'S.No', 'S No', 'Serial Number', 's_no', 'Serial no.', 'Serial No', 'S. No.', 'Sl. No', 'Sl No', 'Sl.No.', 'SlNo',
      'Index', 'Row Number', 'Sr No', 'Sr.No', 'srno', 'Sr_Number'
    ],
    testcase_id: [
      'Test Case ID', 'test case id', 'TestCaseID', 'tc_id', 'Testcase Id', 'TestCase Id', 'test_case_id',
      'Test-Case ID', 'TC ID', 'TCID', 'Test ID', 'Test_ID', 'Test case ID'
    ],
    test_suite: [
      'Test Suite', 'test_suite', 'suite', 'TestSuite', 'Suite Name', 'Test Suite Name', 'Test Category', 'Module',
      'Module Name', 'Feature', 'Feature Name'
    ],
    testcase_description: [
      'Test Case Description', 'Description', 'testcase_description', 'Test Description', 'Test Case Desc',
      'TestCaseDesc', 'Testcase description', 'Case Description', 'Test Description', 'TestCase Description'
    ],
    test_scenario_id: [
      'Test Scenario ID', 'scenario_id', 'Scenario Id', 'Scenario ID', 'TestScenarioID', 'TS_ID', 'Test Sc ID',
      'Scenario Identifier'
    ],
    test_scenario: [
      'Test Case summary', 'Summary', 'test_scenario', 'Test Scenario Description', 'Test Scenario', 'Scenario',
      'Scenario Description', 'Scenario Summary', 'Scenario Desc', 'TestScenarioSummary'
    ],
    prerequisite: [
      'Prerequisite', 'Prereq', 'Pre-requisite', 'prerequisite', 'Pre Requisite', 'Pre-Requisite', 'Pre Conditions',
      'precondition', 'Pre Condition', 'Pre Condition', 'Pre Cond', 'PreCond', 'Required Setup', 'Requirement', 'Req','Pre-Condition'
    ],
    steps_to_reproduce: [
      'Steps to Reproduce', 'Steps', 'steps_to_reproduce', 'Test Steps', 'Reproduction Steps', 'Steps To Reproduce',
      'StepsToReproduce', 'Procedure', 'Execution Steps', 'Test Execution Steps'
    ],
    expected_result: [
      'Expected Result', 'ExpectedOutcome', 'expected_result', 'Expected Output', 'Expected outcome',
      'Expected Behavior', 'Exp Result', 'Expected', 'Expected_Outcome'
    ],
    actual_result: [
      'Actual Result', 'actual_result', 'Actual outcome', 'Actual Output', 'Actual Behavior', 'Observed Result',
      'Actual_Outcome', 'Result Observed', 'Observed Outcome'
    ],
    test_result: [
      'Test Result', 'Result', 'test_result', 'Outcome', 'Test Outcome', 'Test_Status', 'Result Status', 'Final Result',
      'Final Outcome', 'Execution Result', 'Result of Test'
    ],
    status: [
      'Status', 'Test Status', 'status', 'Execution Status', 'Run Status', 'TestState', 'State', 'ExecutionState',
      'Test_Status', 'Current Status'
    ],
    comments: [
      'Comments (if any)', 'Comments', 'comments', 'Comments(if any)', 'Comment', 'Comment(if any)',
      'Comment (if any)', 'Comments (If any)', 'Remarks', 'Notes', 'Note', 'Remarks (if any)', 'Observations',
      'Observation', 'Comment(s)', 'Additional Comments', 'Test Notes'
    ]
  };


    function mapHeaderToDbColumn(header) {
      header = header.trim().toLowerCase();
      for (const [dbCol, alternatives] of Object.entries(headerAlternatives)) {
        if (alternatives.some(h => h.toLowerCase() === header)) {
          return dbCol;
        }
      }
      return header.replace(/\s+/g, '_');
    }

    const { rows: dbColumnsRows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const dbColumns = dbColumnsRows.map(r => r.column_name);

    // Remove s_no and testcase_id if present
    records = records.map(record => {
      const newRecord = { ...record };
      delete newRecord.s_no;
      delete newRecord.testcase_id;
      return newRecord;
    });

    // Fetch proper max values
    const { rows: maxRows } = await pool.query(`
      SELECT 
        MAX(s_no)::int AS max_s_no,
        MAX(CAST(SUBSTRING(testcase_id FROM '\\d+') AS INTEGER)) AS max_tc
      FROM ${tableName}
    `);

    let serialCounter = (parseInt(maxRows[0].max_s_no) || 0) + 1;
    let testcaseCounter = (parseInt(maxRows[0].max_tc) || 0) + 1;

    const normalizedRecords = records.map(record => {
      const normalized = {};

      for (const [key, value] of Object.entries(record)) {
        let val = value;
        if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        const dbCol = mapHeaderToDbColumn(key);
        normalized[dbCol] = val ?? '';
      }

      normalized['s_no'] = serialCounter++;
      normalized['testcase_id'] = `TC_${String(testcaseCounter++).padStart(3, '0')}`;

      if (testSuite && !normalized.test_suite) {
        normalized.test_suite = testSuite;
      }

      dbColumns.forEach(col => {
        if (!(col in normalized)) {
          normalized[col] = '';
        }
      });

      return normalized;
    });

    const columnNames = Object.keys(normalizedRecords[0]);

    console.log('Received columns:', columnNames);
    console.log('DB columns:', dbColumns);
    console.log('Normalized first record:', normalizedRecords[0]);

    for (const col of columnNames) {
      if (!dbColumns.includes(col)) {
        console.error(`Column "${col}" not found in table "${tableName}"`);
        return res.status(400).json({ error: `Column "${col}" not found in table "${tableName}"` });
      }
    }

    const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
    const insertText = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;

    for (const record of normalizedRecords) {
      const values = columnNames.map(col => (record[col] === '' ? null : record[col]));
      try {
        await pool.query(insertText, values);
        } catch (err) {
          if (err.code === '23505') { // unique_violation
            console.warn(`Duplicate test_scenario_id: ${record.test_scenario_id}, skipping...`);
            continue;
          } else {
            throw err;
          }
        }

    }

    res.json({ message: 'CSV uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

//logout for the session

app.post('/logout', (req, res) => {
  sessionStorage.removeItem('token');
  window.location.href = '/login';
  return res.json({ message: 'Logged out successfully' });
});


//to view the whole testcase detail upon clicking and id

// GET: Get test case details in a specific plan
app.get('/api/test-plan/:plan/:id', async (req, res) => {
  const { plan: testplanName, id: testcaseId } = req.params;

  try {
    // Get registry ID by name
    const registryRes = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1 LIMIT 1',
      [testplanName]
    );

    if (registryRes.rows.length === 0) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const registryId = registryRes.rows[0].id;

    // Fetch the test case
    const result = await pool.query(
      'SELECT * FROM testplans WHERE registry_id = $1 AND testcase_id = $2 LIMIT 1',
      [registryId, testcaseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found in this plan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching test case:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update specific fields in a test case
app.put('/api/test-plan/:plan/:id', authenticateToken, authorizeRoles('admin', 'write'), async (req, res) => {
  const { plan: testplanName, id: testcaseId } = req.params;
  const { test_result, status, actual_result, comments } = req.body;
  const username = req.user?.username;

  try {
    const registryRes = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1 LIMIT 1',
      [testplanName]
    );

    if (registryRes.rows.length === 0) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const registryId = registryRes.rows[0].id;

    const fields = [];
    const values = [];
    let i = 1;

    if (test_result !== undefined) {
      fields.push(`test_result = $${i++}`);
      values.push(test_result);
    }
    if (status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(status);
    }
    if (actual_result !== undefined) {
      fields.push(`actual_result = $${i++}`);
      values.push(actual_result);
    }
    if (comments !== undefined) {
      fields.push(`comments = $${i++}`);
      values.push(comments);
    }

    // Always update executed_by with the JWT username
    fields.push(`executed_by = $${i++}`);
    values.push(username);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    // Add WHERE clause values
    values.push(testcaseId);        // $i
    values.push(registryId);        // $i + 1

    const query = `
      UPDATE testplans
      SET ${fields.join(', ')}
      WHERE testcase_id = $${i++} AND registry_id = $${i}
      RETURNING *;
    `;

    const updateRes = await pool.query(query, values);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found in this plan' });
    }

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('Error updating test case:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//==========================================================================BUG TICKET RAISING============================================================================

//Searches for similar bug titles.
app.post('/api/bugs/search', async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required for search' });
  }

  try {
    // Step 1: Get embedding from your local model
    const embedding = await getEmbedding(title); // returns float[]

    // Step 2: Query top 5 similar bugs using cosine similarity
    const query = `
      SELECT *, cosine_similarity(embedding, $1::float8[]) AS similarity
      FROM bugs
      ORDER BY similarity DESC
      LIMIT 3;
    `;

    const result = await pool.query(query, [embedding]);
    res.json(result.rows);
  } catch (err) {
    console.error('Search bug error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

//Creates a new bug entry.
app.post('/api/bugs', authenticateToken, async (req, res) => {
  const { title, description, severity } = req.body;

  if (!title || !description || !severity) {
    return res.status(400).json({ error: 'Title, description, and severity are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO bugs (title, description, severity) VALUES ($1, $2, $3) RETURNING *',
      [title, description, severity]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating bug:', err);
    res.status(500).json({ error: 'Failed to create bug' });
  }
});


//linking bug_id to main testplan table

// PUT /api/test-plan/:planName/:testcaseId/bug
app.put('/api/test-plan/:planName/:testcaseId/bug', authenticateToken, async (req, res) => {
  const { planName, testcaseId } = req.params;
  const { bug_id } = req.body;

  if (!bug_id) {
    return res.status(400).json({ error: 'Missing bug_id in request body' });
  }

  try {
    const registryResult = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1',
      [planName]
    );

    if (registryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const registry_id = registryResult.rows[0].id;

    const updateResult = await pool.query(
      `UPDATE testplans
       SET bug_id = $1, bug_status = 'Open'
       WHERE testcase_id = $2 AND registry_id = $3
       RETURNING *`,
      [bug_id, testcaseId, registry_id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Test case not found for this plan' });
    }

    res.json({ message: 'Bug linked successfully', updated: updateResult.rows[0] });
  } catch (err) {
    console.error('Error linking bug:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//display bug details
// GET /api/bugs/:id?testcase_id=...&test_plan_name=...
app.get('/api/bugs/:id', async (req, res) => {
  const { id } = req.params;
  const { testcase_id, test_plan_name } = req.query;

  if (!testcase_id || !test_plan_name) {
    return res.status(400).json({ error: 'testcase_id and test_plan_name are required' });
  }

  try {
    const query = `
      SELECT 
        b.id AS bug_id,
        b.title,
        b.severity,
        b.description,
        t.testcase_id,
        r.name AS test_plan_name,
        t.bug_status AS status,
        t.registry_id
      FROM bugs b
      INNER JOIN testplans t ON b.id = t.bug_id
      INNER JOIN testplan_registry r ON t.registry_id = r.id
      WHERE b.id = $1
        AND t.testcase_id = $2
        AND LOWER(r.name) = LOWER($3)
      LIMIT 1;
    `;

    const values = [id, testcase_id, test_plan_name];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bug not found for given testcase and test plan' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching bug details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//fetch bug details bug history page
app.get('/api/bug-history', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id AS bug_id,
        b.title,
        b.severity,
        t.testcase_id,
        r.name AS test_plan_name,
        t.bug_status
      FROM bugs b
      INNER JOIN testplans t ON b.id = t.bug_id
      INNER JOIN testplan_registry r ON t.registry_id = r.id
      ORDER BY b.id DESC, r.name, t.testcase_id;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching bug history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//change bug status at bugHistory page by reader or admin and same route used for bug status update in testplan page
// PATCH /api/bug-status
app.patch('/api/bug-status', async (req, res) => {
  const { bug_id, testcase_id, test_plan_name, status } = req.body;

  const allowed = ['Open', 'In Progress', 'Resolved', 'Retesting', 'Closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const registry = await pool.query(
      'SELECT id FROM testplan_registry WHERE name = $1',
      [test_plan_name]
    );
    if (registry.rowCount === 0)
      return res.status(404).json({ error: 'Test plan not found' });

    const registry_id = registry.rows[0].id;

    const result = await pool.query(
      `UPDATE testplans
       SET bug_status = $1
       WHERE bug_id = $2 AND testcase_id = $3 AND registry_id = $4
       RETURNING *`,
      [status, bug_id, testcase_id, registry_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Test case not found for given bug and plan' });
    }

    res.json({ message: 'Bug status updated successfully' });
  } catch (err) {
    console.error('Error updating bug status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});