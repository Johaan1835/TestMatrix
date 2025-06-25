// seedBugs.js
import { Pool } from 'pg';// Adjust path to your PostgreSQL pool
import getEmbedding from './utils/getEmbedding.js';

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

const sampleBugs = [
  {
    title: 'Login button not working on mobile',
    description: 'When clicked on mobile devices, the login button does not trigger any action.',
    severity: 'high'
  },
  {
    title: 'Dashboard layout breaks on small screens',
    description: 'The dashboard components overlap on smaller screen sizes.',
    severity: 'medium'
  },
  {
    title: 'Password reset email not sent',
    description: 'User does not receive a reset email after requesting it.',
    severity: 'high'
  }
];

async function seedBugs() {
  for (const bug of sampleBugs) {
    try {
      const embedding = await getEmbedding(bug.title);

      await pool.query(
        `INSERT INTO bugs (title, description, severity, embedding)
         VALUES ($1, $2, $3, $4)`,
        [bug.title, bug.description, bug.severity, embedding]
      );

      console.log(`✅ Inserted: "${bug.title}"`);
    } catch (err) {
      console.error(`❌ Failed to insert "${bug.title}":`, err);
    }
  }

  await pool.end(); // Close DB pool when done
  console.log('🔁 Seeding complete. Pool closed.');
}

seedBugs();
