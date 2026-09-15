import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

// Получение всех активных кабинетов
export const getClassrooms = async (req, res) => {
  try {
    const classrooms = db.prepare(`
      SELECT id, number, is_active
      FROM classrooms
      WHERE is_active = 1
      ORDER BY number ASC
    `).all();

    res.json(classrooms);
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получение кабинетов конкретного пользователя
export const getUserClassrooms = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Проверяем права: пользователь может смотреть только свои кабинеты, админ - любые
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const classrooms = db.prepare(`
      SELECT uc.id as link_id, c.id, c.number, c.is_active, uc.assigned_at
      FROM user_classrooms uc
      JOIN classrooms c ON uc.classroom_id = c.id
      WHERE uc.user_id = ?
      ORDER BY c.number ASC
    `).all(userId);

    res.json(classrooms);
  } catch (error) {
    console.error('Get user classrooms error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Назначение кабинета пользователю
export const assignUserClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { classroom_id } = req.body;
    const userId = parseInt(id);

    // Проверяем права: только админ может назначать чужие кабинеты, пользователь - только свои
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Проверяем, что кабинет существует и активен
    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(classroom_id);
    if (!classroom) {
      return res.status(404).json({ message: 'Кабинет не найден или неактивен' });
    }

    // Проверяем, не назначен ли уже этот кабинет пользователю
    const existing = db.prepare('SELECT * FROM user_classrooms WHERE user_id = ? AND classroom_id = ?').get(userId, classroom_id);
    if (existing) {
      return res.status(409).json({ message: 'Кабинет уже назначен пользователю' });
    }

    // Назначаем кабинет
    const result = db.prepare(`
      INSERT INTO user_classrooms (user_id, classroom_id, assigned_at)
      VALUES (?, ?, ?)
    `).run(userId, classroom_id, new Date().toISOString());

    // Логируем
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'ASSIGN_CLASSROOM', 'user_classrooms', result.lastInsertRowid, JSON.stringify({ userId, classroomId: classroom_id }));

    res.status(201).json({ message: 'Кабинет успешно назначен', linkId: result.lastInsertRowid });
  } catch (error) {
    console.error('Assign user classroom error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Удаление кабинета у пользователя
export const removeUserClassroom = async (req, res) => {
  try {
    const { id, classroomId } = req.params;
    const userId = parseInt(id);
    const classroom_id = parseInt(classroomId);

    // Проверяем права: только админ может удалять чужие кабинеты, пользователь - только свои
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const result = db.prepare(`
      DELETE FROM user_classrooms
      WHERE user_id = ? AND classroom_id = ?
    `).run(userId, classroom_id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Связка не найдена' });
    }

    // Логируем
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'REMOVE_CLASSROOM', 'user_classrooms', null, JSON.stringify({ userId, classroomId: classroom_id }));

    res.json({ message: 'Кабинет успешно снят с пользователя' });
  } catch (error) {
    console.error('Remove user classroom error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получение доступных для назначения кабинетов
export const getAvailableClassrooms = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Проверяем права
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Получаем все активные кабинеты, которые еще не назначены пользователю
    const classrooms = db.prepare(`
      SELECT c.id, c.number, c.is_active
      FROM classrooms c
      WHERE c.is_active = 1
        AND c.id NOT IN (
          SELECT classroom_id FROM user_classrooms WHERE user_id = ?
        )
      ORDER BY c.number ASC
    `).all(userId);

    res.json(classrooms);
  } catch (error) {
    console.error('Get available classrooms error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Создание новой заявки
export const createRequest = async (req, res) => {
  try {
    const { recipient_group, classroom_id, title, description } = req.body;
    const sender_id = req.user.id;

    // Валидация
    if (!recipient_group || !['admin', 'storekeeper'].includes(recipient_group)) {
      return res.status(400).json({ message: 'Недопустимая группа получателя' });
    }

    if (!classroom_id) {
      return res.status(400).json({ message: 'Кабинет обязателен' });
    }

    if (!title || title.trim().length < 5) {
      return res.status(400).json({ message: 'Заголовок должен быть минимум 5 символов' });
    }

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: 'Описание должно быть минимум 10 символов' });
    }

    // Проверяем, что кабинет принадлежит пользователю
    const userClassroom = db.prepare('SELECT * FROM user_classrooms WHERE user_id = ? AND classroom_id = ?').get(sender_id, classroom_id);
    if (!userClassroom) {
      return res.status(403).json({ message: 'Вы не можете создавать заявки для этого кабинета' });
    }

    // Проверяем, что кабинет существует и активен
    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(classroom_id);
    if (!classroom) {
      return res.status(404).json({ message: 'Кабинет не найден или неактивен' });
    }

    // Создаем заявку
    const result = db.prepare(`
      INSERT INTO requests (sender_id, recipient_group, classroom_id, title, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sender_id, recipient_group, classroom_id, title.trim(), description.trim(), 'pending', new Date().toISOString());

    // Логируем
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'CREATE_REQUEST', 'requests', result.lastInsertRowid, JSON.stringify({ recipient_group, classroom_id, title }));

    res.status(201).json({ message: 'Заявка успешно создана', requestId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получение заявок с фильтрацией
export const getRequests = async (req, res) => {
  try {
    const { recipient_group, sender_id, status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT r.*, u.full_name as sender_name, c.number as classroom_number
      FROM requests r
      JOIN users u ON r.sender_id = u.id
      JOIN classrooms c ON r.classroom_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Фильтрация по группе получателя (пользователь видит только заявки для своей группы)
    if (recipient_group) {
      sql += ' AND r.recipient_group = ?';
      params.push(recipient_group);
    } else {
      // По умолчанию фильтруем по роли пользователя
      const allowedGroups = [];
      if (req.user.role === 'admin' || req.user.role === 'headmaster' || req.user.role === 'deputy') {
        allowedGroups.push('admin');
      }
      if (req.user.role === 'storekeeper') {
        allowedGroups.push('storekeeper');
      }
      if (allowedGroups.length > 0) {
        sql += ` AND r.recipient_group IN (${allowedGroups.map(() => '?').join(',')})`;
        params.push(...allowedGroups);
      }
    }

    // Фильтрация по отправителю
    if (sender_id) {
      sql += ' AND r.sender_id = ?';
      params.push(parseInt(sender_id));
    } else {
      // Учителя видят только свои заявки
      if (req.user.role === 'teacher' || req.user.role === 'tech') {
        sql += ' AND r.sender_id = ?';
        params.push(req.user.id);
      }
    }

    // Фильтрация по статусу
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const requests = db.prepare(sql).all(...params);

    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Обновление заявки (изменение статуса, комментария)
export const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comment } = req.body;
    const requestId = parseInt(id);

    // Получаем заявку
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Проверяем права: только админ/начальник могут обрабатывать заявки админа, завхоз - заявки завхоза
    const canProcessAdmin = ['admin', 'headmaster', 'deputy'].includes(req.user.role) && request.recipient_group === 'admin';
    const canProcessStorekeeper = req.user.role === 'storekeeper' && request.recipient_group === 'storekeeper';

    if (!canProcessAdmin && !canProcessStorekeeper) {
      return res.status(403).json({ message: 'Недостаточно прав для обработки этой заявки' });
    }

    // Проверяем статус - можно менять только pending заявки (кроме админа который может менять любые)
    if (request.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Можно обрабатывать только новые заявки' });
    }

    // Валидация статуса
    if (status && !['pending', 'urgent', 'longterm', 'completed', 'impossible'].includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const updates = [];
    const updateParams = [];

    if (status) {
      updates.push('status = ?');
      updateParams.push(status);
    }

    if (admin_comment !== undefined) {
      updates.push('admin_comment = ?');
      updateParams.push(admin_comment);
    }

    if (status && status !== 'pending') {
      updates.push('processed_at = ?');
      updateParams.push(new Date().toISOString());
      updates.push('processed_by = ?');
      updateParams.push(req.user.id);
    }

    if (updates.length > 0) {
      updateParams.push(requestId);
      db.prepare(`
        UPDATE requests
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...updateParams);
    }

    // Логируем
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 'UPDATE_REQUEST', 'requests', requestId, JSON.stringify({ status, admin_comment }));

    res.json({ message: 'Заявка успешно обновлена' });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// История заявок пользователя
export const getRequestHistory = async (req, res) => {
  try {
    const { user_id } = req.params;
    const targetUserId = parseInt(user_id);

    // Проверяем права: пользователь видит только свою историю, админ - любую
    if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const requests = db.prepare(`
      SELECT r.*, c.number as classroom_number
      FROM requests r
      JOIN classrooms c ON r.classroom_id = c.id
      WHERE r.sender_id = ?
      ORDER BY r.created_at DESC
    `).all(targetUserId);

    res.json(requests);
  } catch (error) {
    console.error('Get request history error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Количество непрочитанных/новых заявок
export const getRequestCount = async (req, res) => {
  try {
    let count = 0;

    // Админ/начальник видят заявки для админа
    if (['admin', 'headmaster', 'deputy'].includes(req.user.role)) {
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM requests
        WHERE recipient_group = 'admin' AND status = 'pending'
      `).get();
      count = result.count;
    }
    // Завхоз видит заявки для завхоза
    else if (req.user.role === 'storekeeper') {
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM requests
        WHERE recipient_group = 'storekeeper' AND status = 'pending'
      `).get();
      count = result.count;
    }
    // Учителя видят только свои
    else {
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM requests
        WHERE sender_id = ? AND status = 'pending'
      `).get(req.user.id);
      count = result.count;
    }

    res.json({ count });
  } catch (error) {
    console.error('Get request count error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Ищем пользователя
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Учетная запись отключена' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    const token = generateToken(user);

    // Логируем успешный вход
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, ip_address, details)
      VALUES (?, ?, ?, ?)
    `).run(user.id, 'LOGIN', req.ip, JSON.stringify({ success: true }));

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const logout = async (req, res) => {
  try {
    // Логируем выход
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, details)
      VALUES (?, ?, ?)
    `).run(req.user.id, 'LOGOUT', JSON.stringify({ success: true }));

    res.json({ message: 'Выход выполнен успешно' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, role, full_name, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Регистрация заявки на создание аккаунта (упрощенная - без email, с кабинетами)
export const registerRequest = async (req, res) => {
  try {
    const { username, password, fullName, classroomIds, recipientGroup } = req.body;

    // Валидация
    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть минимум 6 символов' });
    }

    if (!classroomIds || !Array.isArray(classroomIds) || classroomIds.length === 0) {
      return res.status(400).json({ message: 'Выберите хотя бы один кабинет' });
    }

    if (!['admin', 'storekeeper'].includes(recipientGroup)) {
      return res.status(400).json({ message: 'Выберите корректную группу получателя' });
    }

    // Проверяем, не существует ли уже пользователь с таким username
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Пользователь с таким именем уже существует' });
    }

    // Проверяем, нет ли уже заявки от этого пользователя
    const existingRequest = db.prepare('SELECT * FROM registration_requests WHERE username = ?').get(username);
    if (existingRequest) {
      return res.status(409).json({ message: 'Заявка с таким именем уже подана' });
    }

    // Проверяем, что все выбранные кабинеты существуют и активны
    for (const classroomId of classroomIds) {
      const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(classroomId);
      if (!classroom) {
        return res.status(400).json({ message: `Кабинет ${classroomId} не найден или неактивен` });
      }
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем заявку
    const result = db.prepare(`
      INSERT INTO registration_requests (username, password, email, full_name, classroom_ids, recipient_group, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      hashedPassword,
      null,  // email больше не обязателен
      fullName,
      JSON.stringify(classroomIds),
      recipientGroup,
      'pending',
      new Date().toISOString()
    );

    res.status(201).json({
      message: 'Заявка на регистрацию отправлена. Ожидайте одобрения администратором.',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Register request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получение списка заявок на регистрацию (только для админа)
export const getRegistrationRequests = async (req, res) => {
  try {
    // Проверяем роль админа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const requests = db.prepare(`
      SELECT id, username, email, full_name, status, created_at
      FROM registration_requests
      ORDER BY created_at DESC
    `).all();

    res.json(requests);
  } catch (error) {
    console.error('Get registration requests error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Одобрение заявки на регистрацию
export const approveRegistrationRequest = async (req, res) => {
  try {
    // Проверяем роль админа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const { role } = req.body;

    // Валидация роли
    const validRoles = ['admin', 'headmaster', 'deputy', 'teacher', 'tech', 'storekeeper'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль' });
    }

    // Получаем заявку
    const request = db.prepare('SELECT * FROM registration_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Заявка уже обработана' });
    }

    // Создаем пользователя из заявки
    const userResult = db.prepare(`
      INSERT INTO users (username, password, email, role, full_name, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(request.username, request.password, null, role, request.full_name, 1, new Date().toISOString());

    // Если в заявке есть classroom_ids, назначаем кабинеты пользователю
    if (request.classroom_ids) {
      try {
        const classroomIds = JSON.parse(request.classroom_ids);
        for (const classroomId of classroomIds) {
          db.prepare(`
            INSERT INTO user_classrooms (user_id, classroom_id, assigned_at)
            VALUES (?, ?, ?)
          `).run(userResult.lastInsertRowid, classroomId, new Date().toISOString());
        }
      } catch (e) {
        console.error('Error assigning classrooms:', e);
      }
    }

    // Обновляем статус заявки
    db.prepare(`
      UPDATE registration_requests
      SET status = ?, processed_at = ?, processed_by = ?
      WHERE id = ?
    `).run('approved', new Date().toISOString(), req.user.id, id);

    // Логируем
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, details)
      VALUES (?, ?, ?)
    `).run(req.user.id, 'APPROVE_REGISTRATION', JSON.stringify({ requestId: id, newUserId: userResult.lastInsertRowid, role }));

    res.json({ message: 'Заявка одобрена, пользователь создан', userId: userResult.lastInsertRowid });
  } catch (error) {
    console.error('Approve registration request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};