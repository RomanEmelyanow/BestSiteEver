import bcrypt from 'bcryptjs';
import db from '../config/database.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, role, full_name, is_active, created_at
      FROM users ORDER BY created_at DESC
    `).all();

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Админ может смотреть всех, остальные - только себя
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      return res.status(403).json({ message: 'Недостаточно прав доступа' });
    }

    const user = db.prepare(`
      SELECT id, username, email, role, full_name, is_active, created_at
      FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, password, email, role, fullName } = req.body;

    // Проверка уникальности
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким именем или email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, password, email, role, full_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, hashedPassword, email, role, fullName);

    // Аудит
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'CREATE_USER', 'user', result.lastInsertRowid, JSON.stringify({ username, role, email }));

    res.status(201).json({
      id: result.lastInsertRowid,
      username,
      email,
      role,
      fullName,
      isActive: 1
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, fullName, isActive } = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Админ может менять всех, пользователь - только себя (и не может менять роль)
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      return res.status(403).json({ message: 'Недостаточно прав доступа' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Не-админ не может менять роль и isActive
    if (requestingUserRole !== 'admin') {
      if (role !== undefined || isActive !== undefined) {
        return res.status(403).json({ message: 'Недостаточно прав для изменения роли или статуса' });
      }
    }

    // Проверка уникальности email
    if (email && email !== user.email) {
      const existingEmail = db.prepare('SELECT * FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email уже занят' });
      }
    }

    const updates = [];
    const params = [];

    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (fullName !== undefined) { updates.push('full_name = ?'); params.push(fullName); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    if (updates.length === 1) { // только updated_at
      return res.json({ message: 'Нечего обновлять' });
    }

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Аудит
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'UPDATE_USER', 'user', id, JSON.stringify({ email, role, fullName, isActive }));

    const updatedUser = db.prepare(`
      SELECT id, username, email, role, full_name, is_active, created_at
      FROM users WHERE id = ?
    `).get(id);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Нельзя удалить себя
    if (parseInt(id) === requestingUserId) {
      return res.status(400).json({ message: 'Нельзя удалить самого себя' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    // Аудит
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'DELETE_USER', 'user', id, JSON.stringify({ username: user.username, role: user.role }));

    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};