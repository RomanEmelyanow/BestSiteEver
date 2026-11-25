import express from 'express';
import cors from 'cors';
import './config/loadEnv.js';

const app = express();

// CORS is limited to configured frontends (and local Vite during development).
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = new Set(
  process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : process.env.NODE_ENV === 'production' ? [] : developmentOrigins
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
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
