import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, authorizeRoles, generateToken } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// GET /api/users - список всех пользователей (только для админа)
router.get('/', authenticateToken, authorizeRoles('admin'), userController.getAllUsers);

// GET /api/users/:id - конкретный пользователь (админ или сам пользователь)
router.get('/:id', authenticateToken, userController.getUserById);

// POST /api/users - создать пользователя (только админ)
router.post('/', [
  body('username').notEmpty().withMessage('Имя пользователя обязательно'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  body('email').isEmail().withMessage('Неверный формат email'),
  body('role').isIn(['admin', 'headmaster', 'deputy', 'teacher', 'tech', 'storekeeper'])
    .withMessage('Недопустимая роль'),
  body('fullName').notEmpty().withMessage('Полное имя обязательно')
], authenticateToken, authorizeRoles('admin'), userController.createUser);

// PUT /api/users/:id - обновить пользователя (админ или сам пользователь)
router.put('/:id', [
  body('email').optional().isEmail().withMessage('Неверный формат email'),
  body('role').optional().isIn(['admin', 'headmaster', 'deputy', 'teacher', 'tech', 'storekeeper'])
    .withMessage('Недопустимая роль'),
  body('fullName').optional().notEmpty().withMessage('Полное имя не может быть пустым'),
  body('isActive').optional().isBoolean().withMessage('isActive должно быть boolean')
], authenticateToken, userController.updateUser);

// DELETE /api/users/:id - удалить пользователя (только админ)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), userController.deleteUser);

export default router;