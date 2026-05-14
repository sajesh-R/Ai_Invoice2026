const express = require('express');
const router = express.Router();
const { addPayment, getPayments } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all payment routes

router.post('/', addPayment);
router.get('/', getPayments);

module.exports = router;
