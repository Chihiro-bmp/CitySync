const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT token from the Authorization header.
 * Attaches decoded payload to req.user: { userId, accountId, role }
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-this-secret-in-production'
    );
    req.user = decoded; // { userId, accountId, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;