import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// GET /api/users - список всех пользователей (только для админа)
router.get('/', authenticateToken, authorizeRoles('admin'), userController.getAllUsers);

// GET /api/users/:id - конкретный пользователь (админ или сам пользователь)
router.get('/:id', authenticateToken, userController.getUserById);

// POST /api/users - создать пользователя (только админ)
router.post('/', [
  body('username').isString().trim().notEmpty().withMessage('Имя пользователя обязательно'),
  body('password').isString().isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Неверный формат email'),
  body('role').isIn(['admin', 'teacher', 'storekeeper', 'administration'])
    .withMessage('Недопустимая роль'),
  body('fullName').isString().trim().notEmpty().withMessage('Полное имя обязательно')
], authenticateToken, authorizeRoles('admin'), validateRequest, userController.createUser);

// PUT /api/users/:id - обновить пользователя (админ или сам пользователь)
router.put('/:id', [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Неверный формат email'),
  body('role').optional().isIn(['admin', 'teacher', 'storekeeper', 'administration'])
    .withMessage('Недопустимая роль'),
  body('fullName').optional().isString().trim().notEmpty().withMessage('Полное имя не может быть пустым'),
  body('isActive').optional().isBoolean().withMessage('isActive должно быть boolean').toBoolean()
], authenticateToken, validateRequest, userController.updateUser);

// PUT /api/users/:id/classroom - сменить кабинет пользователя (только админ)
router.put('/:id/classroom', authenticateToken, authorizeRoles('admin'), userController.setUserClassroom);

// DELETE /api/users/:id - удалить пользователя (только админ)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), userController.deleteUser);

export default router;
