import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// GET /api/audit/logs - получить логи аудита (только для админа)
router.get('/logs', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { action, user_id, date_from, date_to, limit = 100 } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }

    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const stmt = db.prepare(query);
    const logs = stmt.all(...params);

    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

export default router;