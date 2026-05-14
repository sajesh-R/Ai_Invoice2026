const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123456789';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains user ID, name, email
    next();
  } catch (error) {
    console.error(`JWT Auth Middleware error: ${error.message}`);
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

module.exports = authMiddleware;
