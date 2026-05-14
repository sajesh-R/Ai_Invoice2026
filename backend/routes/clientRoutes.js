const express = require('express');
const router = express.Router();
const { createClient, getClients, getClientDetails } = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all client routes

router.post('/', createClient);
router.get('/', getClients);
router.get('/:id', getClientDetails);

module.exports = router;
