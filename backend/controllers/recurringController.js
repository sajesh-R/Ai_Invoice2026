const RecurringInvoice = require('../models/RecurringInvoice');
const Client = require('../models/Client');
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
    const client = await Client.findOne({ _id: client_id, user_id: userId });
    if (!client) {
      return res.status(404).json({ message: 'Client not found or unauthorized.' });
    }

    const schedule = new RecurringInvoice({
      user_id: userId,
      client_id,
      billing_cycle,
      next_invoice_date,
      status: 'Active'
    });
    await schedule.save();
    
    const scheduleData = schedule.toObject();
    scheduleData.id = scheduleData._id;

    return res.status(201).json({
      message: 'Recurring billing schedule created successfully!',
      schedule: scheduleData
    });
  } catch (error) {
    console.error(`Create Recurring Schedule Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while creating recurring schedule.' });
  }
};

const getRecurringSchedules = async (req, res) => {
  const userId = req.user.id;

  try {
    const schedules = await RecurringInvoice.find({ user_id: userId })
      .populate('client_id')
      .sort({ _id: -1 });

    const formattedSchedules = schedules.map(schedule => {
      const s = schedule.toObject();
      s.id = s._id;
      s.client_name = s.client_id ? s.client_id.name : 'Unknown';
      s.client_email = s.client_id ? s.client_id.email : 'Unknown';
      return s;
    });

    return res.json({ schedules: formattedSchedules });
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
