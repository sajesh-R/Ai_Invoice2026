const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
let useFallback = false;

// Fallback in-memory database store
const mockDb = {
  users: [],
  clients: [],
  invoices: [],
  invoice_items: [],
  payments: [],
  recurring_invoices: []
};

// Auto-seed mock data if empty
const seedMockData = () => {
  if (mockDb.users.length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPw = bcrypt.hashSync('password', 10);
    
    mockDb.users.push({
      id: 1,
      name: 'Demo Admin',
      email: 'demo@invoicepro.com',
      password: hashedPw,
      created_at: new Date().toISOString()
    });
  }

  if (mockDb.clients.length === 0) {
    mockDb.clients.push({
      id: 1,
      user_id: 1,
      name: 'Stark Enterprises',
      email: 'pepper.potts@stark.com',
      phone: '+1 (555) 000-0000',
      address: '10880 Malibu Point, Malibu, CA'
    });
  }
};

const connectDB = async () => {
  // Try to configure pool
  const connectionString = process.env.DATABASE_URL;
  
  const poolConfig = connectionString 
    ? { connectionString } 
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'invoice_db',
      };

  try {
    console.log("Connecting to PostgreSQL Database...");
    pool = new Pool(poolConfig);
    
    // Test connection
    const client = await pool.connect();
    console.log("PostgreSQL Connected successfully!");
    client.release();

    // Run Migrations (schema.sql)
    await runMigrations();
  } catch (error) {
    console.warn("\n=====================================================================");
    console.warn("⚠️  DATABASE CONNECTION WARNING:");
    console.warn(`Could not connect to PostgreSQL: ${error.message}`);
    console.warn("The application will fallback to an in-memory/JSON mock database!");
    console.warn("You can still fully use, test, and view the app without PostgreSQL.");
    console.warn("To use PostgreSQL, please ensure it is running and update your .env file.");
    console.warn("=====================================================================\n");
    useFallback = true;
    seedMockData();
  }
};

const runMigrations = async () => {
  try {
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log("PostgreSQL database tables created/validated successfully!");

      // Pre-seed demo user in PostgreSQL if it doesn't exist
      const bcrypt = require('bcryptjs');
      const checkAdmin = await pool.query("SELECT * FROM users WHERE email = 'demo@invoicepro.com'");
      if (checkAdmin.rowCount === 0) {
        const hashedPw = await bcrypt.hash('password', 10);
        await pool.query("INSERT INTO users (name, email, password) VALUES ('Demo Admin', 'demo@invoicepro.com', $1)", [hashedPw]);
        console.log("Pre-seeded 'demo@invoicepro.com' admin user inside PostgreSQL successfully!");
      }
    } else {
      console.warn("Migration schema.sql file not found. Skipping migration run.");
    }
  } catch (error) {
    console.error(`Database migration failed: ${error.message}`);
    console.warn("Reverting to in-memory fallback...");
    useFallback = true;
    seedMockData();
  }
};

// Database Query Wrapper to transparently handle Postgres or Fallback Mock DB
const query = async (text, params) => {
  if (useFallback) {
    return handleMockQuery(text, params);
  }
  
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error(`PostgreSQL Database Query Error: ${error.message}`);
    throw error;
  }
};

// Robust In-Memory Mock Database Query Handler
const handleMockQuery = async (sql, params = []) => {
  sql = sql.trim().replace(/\s+/g, ' ');
  const uppercaseSql = sql.toUpperCase();
  
  console.log("\n📥 [MOCK DB QUERY]:", sql);
  console.log("📦 [MOCK DB PARAMS]:", params);

  // Custom mock engine for basic SQL queries used in this app
  // This supports standard CRUD operations to keep the app 100% functional without PG
  
  // 1. SELECT USERS BY EMAIL
  if (uppercaseSql.includes("FROM USERS WHERE EMAIL =")) {
    const email = params[0]?.toLowerCase();
    const rows = mockDb.users.filter(u => u.email.toLowerCase() === email);
    console.log(`✅ [MOCK DB MATCH] SELECT BY EMAIL. Found ${rows.length} rows.`);
    return { rows, rowCount: rows.length };
  }
  
  // 2. SELECT USER BY ID
  if (uppercaseSql.includes("FROM USERS WHERE ID =")) {
    const id = parseInt(params[0]);
    const rows = mockDb.users.filter(u => u.id === id);
    console.log(`✅ [MOCK DB MATCH] SELECT BY USER ID. Found ${rows.length} rows.`);
    return { rows, rowCount: rows.length };
  }

  // 3. INSERT INTO USERS
  if (uppercaseSql.startsWith("INSERT INTO USERS")) {
    const id = mockDb.users.length + 1;
    const newUser = {
      id,
      name: params[0],
      email: params[1],
      password: params[2],
      created_at: new Date().toISOString()
    };
    mockDb.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 4. CLIENTS QUERIES
  if (uppercaseSql.startsWith("SELECT * FROM CLIENTS WHERE USER_ID =")) {
    const userId = parseInt(params[0]);
    const rows = mockDb.clients.filter(c => c.user_id === userId);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("SELECT * FROM CLIENTS WHERE ID =")) {
    const id = parseInt(params[0]);
    const rows = mockDb.clients.filter(c => c.id === id);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("INSERT INTO CLIENTS")) {
    const id = mockDb.clients.length + 1;
    const newClient = {
      id,
      user_id: parseInt(params[0]),
      name: params[1],
      email: params[2],
      phone: params[3],
      address: params[4],
      created_at: new Date().toISOString()
    };
    mockDb.clients.push(newClient);
    return { rows: [newClient], rowCount: 1 };
  }

  // 5. INVOICES QUERIES
  if (uppercaseSql.includes("FROM INVOICES JOIN CLIENTS") && uppercaseSql.includes("WHERE INVOICES.ID =")) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const rows = mockDb.invoices
      .filter(i => i.id === id && i.user_id === userId)
      .map(inv => {
        const client = mockDb.clients.find(c => c.id === inv.client_id) || {};
        return {
          ...inv,
          client_name: client.name || "Unknown Client",
          client_email: client.email || "",
          client_phone: client.phone || "",
          client_address: client.address || ""
        };
      });
    console.log(`✅ [MOCK DB MATCH] INVOICES JOIN CLIENTS. ID: ${id}, USER: ${userId}. Found ${rows.length} rows.`);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("SELECT INVOICES.*")) {
    // Select with Client details join
    const userId = parseInt(params[0]);
    const rows = mockDb.invoices
      .filter(i => i.user_id === userId)
      .map(inv => {
        const client = mockDb.clients.find(c => c.id === inv.client_id) || {};
        return {
          ...inv,
          client_name: client.name || "Unknown Client",
          client_email: client.email || ""
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.includes("SELECT * FROM INVOICES WHERE ID =")) {
    const id = parseInt(params[0]);
    const rows = mockDb.invoices.filter(i => i.id === id);
    console.log(`✅ [MOCK DB MATCH] SELECT INVOICES BY ID: ${id}. Found ${rows.length} rows.`);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.includes("SELECT INVOICE_NUMBER FROM INVOICES ORDER BY ID DESC")) {
    const rows = [...mockDb.invoices].sort((a, b) => b.id - a.id);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("INSERT INTO INVOICES")) {
    const id = mockDb.invoices.length + 1;
    const newInvoice = {
      id,
      user_id: parseInt(params[0]),
      invoice_number: params[1],
      client_id: parseInt(params[2]),
      total_amount: parseFloat(params[3]),
      gst_vat_amount: parseFloat(params[4]),
      paid_amount: 0.00,
      balance_amount: parseFloat(params[3]), // Starting balance is total amount
      status: 'Unpaid',
      pdf_path: null,
      due_date: params[5], // Map parameter 6 to due_date
      created_at: new Date().toISOString()
    };
    mockDb.invoices.push(newInvoice);
    console.log("✅ [MOCK DB MATCH] INSERTED NEW INVOICE:", newInvoice);
    return { rows: [newInvoice], rowCount: 1 };
  }

  if (uppercaseSql.startsWith("UPDATE INVOICES SET PDF_PATH =")) {
    const pdfPath = params[0];
    const id = parseInt(params[1]);
    const invoice = mockDb.invoices.find(i => i.id === id);
    if (invoice) {
      invoice.pdf_path = pdfPath;
    }
    return { rows: [invoice], rowCount: 1 };
  }

  if (uppercaseSql.startsWith("UPDATE INVOICES SET PAID_AMOUNT =")) {
    const paid = parseFloat(params[0]);
    const balance = parseFloat(params[1]);
    const status = params[2];
    const id = parseInt(params[3]);
    const invoice = mockDb.invoices.find(i => i.id === id);
    if (invoice) {
      invoice.paid_amount = paid;
      invoice.balance_amount = balance;
      invoice.status = status;
    }
    return { rows: [invoice], rowCount: 1 };
  }

  if (uppercaseSql.includes("UPDATE INVOICES SET STATUS = 'OVERDUE'")) {
    // Overdue updates
    const nowStr = new Date().toISOString().split('T')[0];
    const overdueInvoices = mockDb.invoices.filter(i => i.status !== 'Paid' && i.due_date < nowStr);
    overdueInvoices.forEach(i => i.status = 'Overdue');
    return { rowCount: overdueInvoices.length };
  }

  // 6. INVOICE ITEMS QUERIES
  if (uppercaseSql.startsWith("SELECT * FROM INVOICE_ITEMS WHERE INVOICE_ID =")) {
    const invoiceId = parseInt(params[0]);
    const rows = mockDb.invoice_items.filter(item => item.invoice_id === invoiceId);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("INSERT INTO INVOICE_ITEMS")) {
    const id = mockDb.invoice_items.length + 1;
    const newItem = {
      id,
      invoice_id: parseInt(params[0]),
      description: params[1],
      quantity: parseInt(params[2]),
      rate: parseFloat(params[3]),
      gst_vat_percentage: parseFloat(params[4]),
      amount: parseFloat(params[5])
    };
    mockDb.invoice_items.push(newItem);
    return { rows: [newItem], rowCount: 1 };
  }

  // 7. PAYMENTS QUERIES
  if (uppercaseSql.startsWith("SELECT * FROM PAYMENTS WHERE INVOICE_ID =")) {
    const invoiceId = parseInt(params[0]);
    const rows = mockDb.payments.filter(p => p.invoice_id === invoiceId);
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("SELECT PAYMENTS.*")) {
    // Select payments with invoice + client details
    const userId = parseInt(params[0]);
    const rows = mockDb.payments
      .filter(p => {
        const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
        return inv && inv.user_id === userId;
      })
      .map(p => {
        const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
        const client = mockDb.clients.find(c => c.id === inv.client_id) || {};
        return {
          ...p,
          invoice_number: inv.invoice_number,
          client_name: client.name
        };
      })
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("INSERT INTO PAYMENTS")) {
    const id = mockDb.payments.length + 1;
    const newPayment = {
      id,
      invoice_id: parseInt(params[0]),
      payment_amount: parseFloat(params[1]),
      payment_date: new Date().toISOString()
    };
    mockDb.payments.push(newPayment);
    return { rows: [newPayment], rowCount: 1 };
  }

  // 8. RECURRING INVOICES QUERIES
  if (uppercaseSql.startsWith("SELECT RECURRING_INVOICES.*")) {
    const userId = parseInt(params[0]);
    const rows = mockDb.recurring_invoices
      .filter(ri => ri.user_id === userId)
      .map(ri => {
        const client = mockDb.clients.find(c => c.id === ri.client_id) || {};
        return {
          ...ri,
          client_name: client.name,
          client_email: client.email
        };
      });
    return { rows, rowCount: rows.length };
  }

  if (uppercaseSql.startsWith("INSERT INTO RECURRING_INVOICES")) {
    const id = mockDb.recurring_invoices.length + 1;
    const newRi = {
      id,
      user_id: parseInt(params[0]),
      client_id: parseInt(params[1]),
      billing_cycle: params[2],
      next_invoice_date: params[3],
      last_generated_date: null,
      status: 'Active',
      created_at: new Date().toISOString()
    };
    mockDb.recurring_invoices.push(newRi);
    return { rows: [newRi], rowCount: 1 };
  }

  if (uppercaseSql.includes("UPDATE RECURRING_INVOICES SET NEXT_INVOICE_DATE =")) {
    const nextDate = params[0];
    const lastGen = params[1];
    const id = parseInt(params[2]);
    const ri = mockDb.recurring_invoices.find(r => r.id === id);
    if (ri) {
      ri.next_invoice_date = nextDate;
      ri.last_generated_date = lastGen;
    }
    return { rows: [ri], rowCount: 1 };
  }

  // DEFAULT EMPTY RESPONSE
  return { rows: [], rowCount: 0 };
};

module.exports = {
  connectDB,
  query,
  getIsFallback: () => useFallback
};
