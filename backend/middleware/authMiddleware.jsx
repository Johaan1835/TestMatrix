import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Incoming Token:', token);

  if (!token) {
    console.log('🚫 No token found');
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err);
      return res.sendStatus(403); // Forbidden
    }

    console.log('✅ Token verified. User:', user);
    req.user = user;
    next();
  });
}


export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    console.log('🔍 Auth Role Check:', req.user); // Add this
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }
    next();
  };
}

