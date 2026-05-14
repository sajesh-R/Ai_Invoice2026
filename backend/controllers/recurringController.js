const db = require('../config/db');
const { processRecurringInvoices, processOverdueReminders } = require('../services/cronService');

const createRecurringSchedule = async (req, res) => {
  const { client_id, billing_cycle, next_invoice_date } = req.body;
  const userId = req.user.id;

  if (!client_id || !billing_cycle || !next_invoice_date) {
    return res.status(400).json({ message: 'Client ID, Billing Cycle, and Next Invoice Date are required fields.' });
  }

  const validCycles = ['Weekly', 'Monthly', 'Quarterly', 'Annually'];
  if (!validCycles.includes(billing_cycle)) {
    return res.status(400).json({ message: `Billing Cycle must be one of: ${validCycles.join(', ')}` });
  }

  try {
    // Validate client belongs to user
    const clientQuery = 'SELECT id FROM clients WHERE id = $1 AND user_id = $2';
    const clientRes = await db.query(clientQuery, [client_id, userId]);
    if (clientRes.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found or unauthorized.' });
    }

    const insertQuery = `
      INSERT INTO recurring_invoices (user_id, client_id, billing_cycle, next_invoice_date, status)
      VALUES ($1, $2, $3, $4, 'Active')
      RETURNING *
    `;
    const result = await db.query(insertQuery, [userId, client_id, billing_cycle, next_invoice_date]);
    
    return res.status(201).json({
      message: 'Recurring billing schedule created successfully!',
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error(`Create Recurring Schedule Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while creating recurring schedule.' });
  }
};

const getRecurringSchedules = async (req, res) => {
  const userId = req.user.id;

  try {
    const fetchQuery = `
      SELECT ri.*, clients.name as client_name, clients.email as client_email
      FROM recurring_invoices ri
      JOIN clients ON ri.client_id = clients.id
      WHERE ri.user_id = $1
      ORDER BY ri.id DESC
    `;
    const result = await db.query(fetchQuery, [userId]);
    return res.json({ schedules: result.rows });
  } catch (error) {
    console.error(`Get Recurring Schedules Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while fetching recurring schedules.' });
  }
};

/**
 * On-demand manual trigger for recurring jobs and reminders.
 * Incredibly useful for testing and demonstrations!
 */
const triggerManualJobs = async (req, res) => {
  try {
    console.log("⚡ Manual trigger requested for scheduler tasks...");
    
    // Process recurring invoices
    await processRecurringInvoices();
    
    // Process overdue reminders
    await processOverdueReminders();
    
    return res.json({
      message: 'Scheduler jobs processed successfully in on-demand manual mode!'
    });
  } catch (error) {
    console.error(`Manual Job Trigger Error: ${error.message}`);
    return res.status(500).json({ message: `Failed to execute jobs: ${error.message}` });
  }
};

module.exports = {
  createRecurringSchedule,
  getRecurringSchedules,
  triggerManualJobs
};
