import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import '../config/loadEnv.js';
import db from '../config/database.js';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production');
}

// Use a per-process secret for local development; production must provide its own.
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const [scheme, token] = authHeader?.split(' ') || [];

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const session = claims.jti
      ? db.prepare('SELECT * FROM sessions WHERE token_id = ?').get(claims.jti)
      : null;
    if (!session || session.user_id !== claims.id) {
      return res.status(401).json({ message: 'Сессия завершена. Войдите снова.' });
    }

    const account = db.prepare('SELECT * FROM users WHERE id = ?').get(claims.id);
    if (!account || !account.is_active) {
      return res.status(401).json({ message: 'Учетная запись недоступна' });
    }

    // Read authorization data from storage so role/status changes take effect immediately.
    req.user = { id: account.id, username: account.username, role: account.role, tokenId: claims.jti };
    return next();
  } catch (error) {
    return res.status(403).json({ message: 'Недействительный или просроченный токен' });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Недостаточно прав доступа' });
    }

    next();
  };
};

export const generateToken = (user) => {
  const tokenId = randomUUID();
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', jwtid: tokenId }
  );
  db.prepare('INSERT INTO sessions (token_id, user_id, created_at) VALUES (?, ?, ?)')
    .run(tokenId, user.id, new Date().toISOString());
  return token;
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
