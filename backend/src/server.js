import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes will be added here
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

// Public endpoint for classrooms (no auth required - needed for registration page)
import { getClassrooms } from './controllers/auth.controller.js';
app.get('/api/classrooms', getClassrooms);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Что-то пошло не так!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});