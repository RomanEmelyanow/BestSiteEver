# Школьный внутренний сайт - контекст проекта

## Что это
Внутренняя система для администрации, завхоза и учителей школы. НЕ для школьников!

## Архитектура
- Монорепозиторий с workspaces
- Бэкенд: Node.js + Express, порт 5000
- Фронтенд: React + Vite, порт 3000
- API прокси через Vite: `/api` → `http://localhost:5000/api`

## Роли (назначаются через админ-панель)
admin, teacher, storekeeper, administration

## Настройка для локального запуска
- Скопируйте `backend/.env.example` в `backend/.env` и задайте уникальные `JWT_SECRET` и `INITIAL_ADMIN_PASSWORD`.
- Инициализируйте администратора командой `npm run init-db --workspace=backend`.
- **API**: `/api` (Vite проксирует запросы на `http://localhost:5000/api`)
- **Фронтенд**: http://localhost:3000

## Дизайн
- Темный минимализм
- Фиолетовый градиент (#7c3aed → #a78bfa)
- Цвета: #0a0e27, #141b2f

## Запуск
```bash
npm install
npm run dev
```

Хранилище сейчас JSON-файл `backend/data/school.json`; для нескольких процессов или реальной эксплуатации нужен сервер БД.
