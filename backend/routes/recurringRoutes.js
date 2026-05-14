const express = require('express');
const router = express.Router();
const { createRecurringSchedule, getRecurringSchedules, triggerManualJobs } = require('../controllers/recurringController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all recurring routes

router.post('/', createRecurringSchedule);
router.get('/', getRecurringSchedules);
router.post('/trigger-jobs', triggerManualJobs); // Manual triggering of the jobs for quick testing!

module.exports = router;
