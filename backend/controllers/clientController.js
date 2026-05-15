const Client = require('../models/Client');

const createClient = async (req, res) => {
  const { name, email, phone, address } = req.body;
  const userId = req.user.id;

  if (!name || !email) {
    return res.status(400).json({ message: 'Client Name and Email are required fields.' });
  }

  try {
    const client = new Client({
      user_id: userId,
      name,
      email,
      phone,
      address
    });
    await client.save();
    
    const clientData = client.toObject();
    clientData.id = clientData._id;

    return res.status(201).json({
      message: 'Client created successfully!',
      client: clientData
    });
  } catch (error) {
    console.error(`Client Create Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while creating client.' });
  }
};

const getClients = async (req, res) => {
  const userId = req.user.id;

  try {
    const clients = await Client.find({ user_id: userId }).sort({ name: 1 });
    
    const formattedClients = clients.map(client => {
      const c = client.toObject();
      c.id = c._id;
      return c;
    });

    return res.json({ clients: formattedClients });
  } catch (error) {
    console.error(`Get Clients Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while retrieving clients.' });
  }
};

const getClientDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const client = await Client.findOne({ _id: id, user_id: userId });

    if (!client) {
      return res.status(404).json({ message: 'Client not found or access denied.' });
    }

    const clientData = client.toObject();
    clientData.id = clientData._id;

    return res.json({ client: clientData });
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
