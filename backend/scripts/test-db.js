require('dotenv').config({ path: '../.env' });
const db = require('../config/db');

async function checkUser() {
  await db.connectDB();
  console.log('Checking for sajesh@gmail.com...');
  
  try {
    const res = await db.query("SELECT id, name, email FROM users WHERE email = $1", ['sajesh@gmail.com']);
    console.log('Result for sajesh@gmail.com:', res.rows);
    
    const allUsers = await db.query("SELECT id, name, email FROM users", []);
    console.log('All registered emails in DB:', allUsers.rows);
  } catch (error) {
    console.error('Error querying DB:', error);
  }
  
  process.exit(0);
}

checkUser();
