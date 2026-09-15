import db from './database.js';
import bcrypt from 'bcryptjs';

console.log('Инициализация базы данных...');

// Создаем администратора по умолчанию, если его нет
const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, password, email, role, full_name)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', hashedPassword, 'admin@school.local', 'admin', 'Системный администратор');
  console.log('Создан пользователь-администратор: admin / admin123');
} else {
  console.log('Пользователь-администратор уже существует');
}

console.log('Инициализация завершена.');