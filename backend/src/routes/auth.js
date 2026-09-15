import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('username').notEmpty().withMessage('Имя пользователя обязательно'),
  body('password').notEmpty().withMessage('Пароль обязателен')
], authController.login);

// POST /api/auth/logout
router.post('/logout', authenticateToken, authController.logout);

// GET /api/auth/me
router.get('/me', authenticateToken, authController.getCurrentUser);

// POST /api/auth/register-request - заявка на регистрацию (только для неактивных пользователей)
router.post('/register-request', authController.registerRequest);

// GET /api/auth/registration-requests - список заявок (только для админа)
router.get('/registration-requests', authenticateToken, authController.getRegistrationRequests);

// POST /api/auth/registration-requests/:id/approve - одобрение заявки (только для админа)
router.post('/registration-requests/:id/approve', authenticateToken, authController.approveRegistrationRequest);

// Новые маршруты для заявок
// POST /api/auth/requests - создать новую заявку
router.post('/requests', authenticateToken, authController.createRequest);

// GET /api/auth/requests - получить заявки с фильтрацией
router.get('/requests', authenticateToken, authController.getRequests);

// PATCH /api/auth/requests/:id - обновить заявку
router.patch('/requests/:id', authenticateToken, authController.updateRequest);

// GET /api/auth/requests/history/:user_id - история заявок пользователя
router.get('/requests/history/:user_id', authenticateToken, authController.getRequestHistory);

// GET /api/auth/requests/count - количество непрочитанных заявок
router.get('/requests/count', authenticateToken, authController.getRequestCount);

// Новые маршруты для кабинетов
// GET /api/auth/classrooms - получить все активные кабинеты
router.get('/classrooms', authenticateToken, authController.getClassrooms);

// GET /api/auth/users/:id/classrooms - получить кабинеты конкретного пользователя
router.get('/users/:id/classrooms', authenticateToken, authController.getUserClassrooms);

// POST /api/auth/users/:id/classrooms - назначить кабинет пользователю
router.post('/users/:id/classrooms', authenticateToken, authController.assignUserClassroom);

// DELETE /api/auth/users/:id/classrooms/:classroomId - снять кабинет с пользователя
router.delete('/users/:id/classrooms/:classroomId', authenticateToken, authController.removeUserClassroom);

// GET /api/auth/users/:id/available-classrooms - получить доступные для назначения кабинеты
router.get('/users/:id/available-classrooms', authenticateToken, authController.getAvailableClassrooms);

export default router;