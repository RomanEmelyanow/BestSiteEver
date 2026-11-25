import db from './database.js';
import bcrypt from 'bcryptjs';
import './loadEnv.js';

console.log('Инициализация базы данных...');

// Создаем администратора по умолчанию, если его нет
const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initialPassword || initialPassword.length < 12) {
    throw new Error('Set INITIAL_ADMIN_PASSWORD to at least 12 characters before initializing the administrator');
  }
  const hashedPassword = await bcrypt.hash(initialPassword, 10);
  db.prepare(`
    INSERT INTO users (username, password, email, role, full_name)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', hashedPassword, 'admin@school.local', 'admin', 'Системный администратор');
  console.log('Создана учетная запись администратора: admin');
} else {
  console.log('Пользователь-администратор уже существует');
}

console.log('Инициализация завершена.');
