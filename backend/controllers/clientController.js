const db = require('../config/db');

const createClient = async (req, res) => {
  const { name, email, phone, address } = req.body;
  const userId = req.user.id;

  if (!name || !email) {
    return res.status(400).json({ message: 'Client Name and Email are required fields.' });
  }

  try {
    const insertQuery = `
      INSERT INTO clients (user_id, name, email, phone, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [userId, name, email, phone, address]);
    return res.status(201).json({
      message: 'Client created successfully!',
      client: result.rows[0]
    });
  } catch (error) {
    console.error(`Client Create Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while creating client.' });
  }
};

const getClients = async (req, res) => {
  const userId = req.user.id;

  try {
    const fetchQuery = 'SELECT * FROM clients WHERE user_id = $1 ORDER BY name ASC';
    const result = await db.query(fetchQuery, [userId]);
    return res.json({ clients: result.rows });
  } catch (error) {
    console.error(`Get Clients Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while retrieving clients.' });
  }
};

const getClientDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const fetchQuery = 'SELECT * FROM clients WHERE id = $1 AND user_id = $2';
    const result = await db.query(fetchQuery, [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found or access denied.' });
    }

    return res.json({ client: result.rows[0] });
  } catch (error) {
    console.error(`Get Client Details Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error retrieving client details.' });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientDetails
};
