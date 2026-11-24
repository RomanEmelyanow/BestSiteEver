import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

export const ROLES = ['admin', 'teacher', 'storekeeper', 'administration'];
export const RECIPIENT_GROUPS = ['admin', 'storekeeper'];
export const RECIPIENT_LABELS = { admin: 'Админ', storekeeper: 'Завхоз' };
export const REQUEST_STATUSES = ['sent', 'completed', 'impossible'];

const roleToGroup = (role) => role;

const withRequestDetails = (request, dbData) => {
  const sender = dbData.users.find(u => u.id === request.sender_id);
  const classroom = dbData.classrooms.find(c => c.id === request.classroom_id);
  return {
    ...request,
    sender_name: sender ? sender.full_name : null,
    classroom_number: classroom ? classroom.number : null,
  };
};

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

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(classroom_id);
    if (!classroom) {
      return res.status(404).json({ message: 'Кабинет не найден или неактивен' });
    }

    const existing = db.prepare('SELECT * FROM user_classrooms WHERE user_id = ? AND classroom_id = ?').get(userId, classroom_id);
    if (existing) {
      return res.status(409).json({ message: 'Кабинет уже назначен пользователю' });
    }

    const result = db.prepare(`
      INSERT INTO user_classrooms (user_id, classroom_id, assigned_at)
      VALUES (?, ?, ?)
    `).run(userId, classroom_id, new Date().toISOString());

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

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const assigned = db.prepare('SELECT * FROM user_classrooms WHERE user_id = ?').all(userId);
    const assignedIds = new Set(assigned.map(link => link.classroom_id));
    const classrooms = db.prepare(`
      SELECT c.id, c.number, c.is_active
      FROM classrooms c
      WHERE c.is_active = 1
      ORDER BY c.number ASC
    `).all().filter(c => !assignedIds.has(c.id));

    res.json(classrooms);
  } catch (error) {
    console.error('Get available classrooms error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Создание кабинета (админ)
export const createClassroom = async (req, res) => {
  try {
    const number = String(req.body.number || '').trim();
    if (!number) {
      return res.status(400).json({ message: 'Укажите номер кабинета' });
    }

    const existing = db.prepare('SELECT * FROM classrooms').all().find(c => c.number === number);
    if (existing) {
      return res.status(400).json({ message: `Кабинет ${number} уже существует` });
    }

    const result = db.prepare('INSERT INTO classrooms (number, is_active) VALUES (?, ?)').run(number, 1);
    res.status(201).json({ id: result.lastInsertRowid, number, is_active: 1 });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Удаление кабинета (админ)
export const deleteClassroom = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Кабинет не найден' });
    }

    db.prepare('DELETE FROM user_classrooms WHERE classroom_id = ?').run(id);
    db.prepare('DELETE FROM classrooms WHERE id = ?').run(id);
    res.json({ message: 'Кабинет удалён' });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Создание новой заявки
export const createRequest = async (req, res) => {
  try {
    const { recipient_group, classroom_id, title = '', description = '' } = req.body;
    const sender_id = req.user.id;

    if (!recipient_group || !RECIPIENT_GROUPS.includes(recipient_group)) {
      return res.status(400).json({ message: 'Недопустимый адресат заявки' });
    }

    if (!classroom_id) {
      return res.status(400).json({ message: 'Кабинет обязателен' });
    }

    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(classroom_id);
    if (!classroom) {
      return res.status(404).json({ message: 'Кабинет не найден или неактивен' });
    }

    const result = db.prepare(`
      INSERT INTO requests (sender_id, recipient_group, classroom_id, title, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sender_id, recipient_group, classroom_id, String(title).trim(), String(description).trim(), 'sent', new Date().toISOString());

    res.status(201).json({ message: 'Заявка успешно создана', requestId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получение заявок: direction=incoming (адресованные группе пользователя) или outgoing (созданные пользователем)
export const getRequests = async (req, res) => {
  try {
    const { direction = 'incoming', status, recipient_group } = req.query;
    const dbData = {
      users: db.prepare('SELECT * FROM users').all(),
      classrooms: db.prepare('SELECT * FROM classrooms').all(),
    };

    let requests;
    if (direction === 'outgoing') {
      requests = db.prepare('SELECT * FROM requests WHERE sender_id = ?').all(req.user.id);
    } else {
      const groups = req.user.role === 'admin' ? RECIPIENT_GROUPS : [roleToGroup(req.user.role)];
      requests = groups.flatMap(group =>
        db.prepare('SELECT * FROM requests WHERE recipient_group = ?').all(group)
      );
    }

    if (recipient_group && RECIPIENT_GROUPS.includes(recipient_group)) {
      requests = requests.filter(r => r.recipient_group === recipient_group);
    }

    if (status === 'archive') {
      requests = requests.filter(r => ['completed', 'impossible'].includes(r.status));
    } else if (status) {
      requests = requests.filter(r => r.status === status);
    }

    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(requests.map(request => withRequestDetails(request, dbData)));
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Обработка заявки получателем: выполнить или невозможно выполнить
export const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comment } = req.body;
    const requestId = parseInt(id);

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    if (req.user.role !== 'admin' && request.recipient_group !== roleToGroup(req.user.role)) {
      return res.status(403).json({ message: 'Недостаточно прав для обработки этой заявки' });
    }

    if (request.status !== 'sent') {
      return res.status(400).json({ message: 'Заявка уже обработана' });
    }

    if (!status || !['completed', 'impossible'].includes(status)) {
      return res.status(400).json({ message: 'Заявку можно закрыть статусом «выполнено» или «невозможно выполнить»' });
    }

    db.prepare(`
      UPDATE requests
      SET status = ?, admin_comment = ?, processed_at = ?, processed_by = ?
      WHERE id = ?
    `).run(status, admin_comment === undefined ? null : String(admin_comment), new Date().toISOString(), req.user.id, requestId);

    res.json({ message: 'Заявка успешно обновлена' });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Удаление обработанной заявки из архива (только админ)
export const deleteRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    db.prepare('DELETE FROM requests WHERE id = ?').run(id);
    res.json({ message: 'Заявка удалена из архива' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Переадресация необработанной заявки между админом и завхозом
export const redirectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipient_group: target } = req.body;
    const requestId = parseInt(id);

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    if (req.user.role !== 'admin' && request.recipient_group !== roleToGroup(req.user.role)) {
      return res.status(403).json({ message: 'Недостаточно прав для переадресации этой заявки' });
    }

    if (request.status !== 'sent') {
      return res.status(400).json({ message: 'Переадресовать можно только необработанную заявку' });
    }

    if (!RECIPIENT_GROUPS.includes(target) || target === request.recipient_group) {
      return res.status(400).json({ message: 'Заявку можно переадресовать только между админом и завхозом' });
    }

    db.prepare('UPDATE requests SET recipient_group = ? WHERE id = ?').run(target, requestId);
    res.json({ message: `Заявка переадресована: ${RECIPIENT_LABELS[target]}` });
  } catch (error) {
    console.error('Redirect request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// История исходящих заявок пользователя
export const getRequestHistory = async (req, res) => {
  try {
    const { user_id } = req.params;
    const targetUserId = parseInt(user_id);

    if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const requests = db.prepare('SELECT * FROM requests WHERE sender_id = ?').all(targetUserId);
    const dbData = {
      users: db.prepare('SELECT * FROM users').all(),
      classrooms: db.prepare('SELECT * FROM classrooms').all(),
    };

    res.json(requests.map(request => withRequestDetails(request, dbData)));
  } catch (error) {
    console.error('Get request history error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Количество необработанных входящих заявок
export const getRequestCount = async (req, res) => {
  try {
    const groups = req.user.role === 'admin' ? RECIPIENT_GROUPS : [roleToGroup(req.user.role)];
    const all = db.prepare('SELECT * FROM requests').all();
    const count = all.filter(r => groups.includes(r.recipient_group) && r.status === 'sent').length;

    res.json({ count });
  } catch (error) {
    console.error('Get request count error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

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

// Регистрация заявки на создание аккаунта
export const registerRequest = async (req, res) => {
  try {
    const { username, password, fullName, classroomIds = [] } = req.body;

    const cleanUsername = String(username || '').trim();
    const cleanFullName = String(fullName || '').trim();

    if (!cleanUsername || !password || !cleanFullName) {
      return res.status(400).json({ message: 'Логин, пароль и ФИО обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть минимум 6 символов' });
    }

    if (classroomIds !== undefined && classroomIds !== null && (!Array.isArray(classroomIds) || classroomIds.length > 1)) {
      return res.status(400).json({ message: 'Можно выбрать не более одного кабинета' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ message: 'Пользователь с таким логином уже существует' });
    }

    const existingRequest = db.prepare('SELECT * FROM registration_requests WHERE username = ?').get(cleanUsername);
    if (existingRequest) {
      return res.status(409).json({ message: 'Заявка с таким логином уже подана' });
    }

    for (const classroomId of classroomIds) {
      const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(classroomId);
      if (!classroom) {
        return res.status(400).json({ message: `Кабинет ${classroomId} не найден или неактивен` });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO registration_requests (username, password, email, full_name, classroom_ids, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanUsername,
      hashedPassword,
      null,
      cleanFullName,
      JSON.stringify(classroomIds),
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role || !ROLES.includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль' });
    }

    const request = db.prepare('SELECT * FROM registration_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Заявка уже обработана' });
    }

    const userResult = db.prepare(`
      INSERT INTO users (username, password, email, role, full_name, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(request.username, request.password, null, role, request.full_name, 1, new Date().toISOString());

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

    db.prepare(`
      UPDATE registration_requests
      SET status = ?, processed_at = ?, processed_by = ?
      WHERE id = ?
    `).run('approved', new Date().toISOString(), req.user.id, id);

    res.json({ message: 'Заявка одобрена, пользователь создан', userId: userResult.lastInsertRowid });
  } catch (error) {
    console.error('Approve registration request error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};
