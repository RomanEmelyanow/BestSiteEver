import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'school.json');

// Создаем директорию data если её нет
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const buildClassrooms = () => {
  const ranges = [
    [100, 130],
    [200, 230],
    [300, 330],
  ];
  const classrooms = [];
  let id = 1;
  for (const [from, to] of ranges) {
    for (let number = from; number <= to; number += 1) {
      classrooms.push({ id: id++, number: String(number), is_active: 1 });
    }
  }
  return classrooms;
};

const emptyDb = () => ({
  users: [],
  sessions: [],
  registration_requests: [],
  classrooms: [],
  user_classrooms: [],
  requests: [],
});

// Инициализируем базу данных если файла нет
if (!existsSync(dbPath)) {
  const initialData = {
    ...emptyDb(),
    classrooms: buildClassrooms(),
  };
  writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
}

// Вспомогательные функции для работы с базой данных
const readDb = () => {
  try {
    const data = readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    const base = emptyDb();
    return { ...base, ...parsed };
  } catch (err) {
    console.error('Error reading database:', err);
    return emptyDb();
  }
};

const writeDb = (data) => {
  try {
    writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing database:', err);
  }
};

const sortRequests = (requests) =>
  [...requests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// Обертка для имитации better-sqlite3 API
const db = {
  prepare: (sql) => {
    // Парсим SQL для определения операции
    const lowerSql = sql.toLowerCase().trim();
    const sqlNorm = lowerSql.replace(/\s+/g, ' ');

    if (lowerSql.startsWith('select')) {
      return {
        get: (...params) => {
          const db = readDb();
          if (sqlNorm.includes('from users')) {
            if (sqlNorm.includes('where username = ?')) {
              return db.users.find(u => u.username === params[0]);
            }
            if (sqlNorm.includes('where id = ?')) {
              return db.users.find(u => u.id === parseInt(params[0]));
            }
            if (sqlNorm.includes('order by created_at desc')) {
              return [...db.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return db.users;
          }
          if (sqlNorm.includes('from classrooms')) {
            if (sqlNorm.includes('where is_active = ?')) {
              return db.classrooms.filter(c => c.is_active === 1);
            }
            if (sqlNorm.includes('where id = ?')) {
              return db.classrooms.find(c => c.id === parseInt(params[0]));
            }
            return db.classrooms;
          }
          if (sqlNorm.includes('from user_classrooms')) {
            if (sqlNorm.includes('where user_id = ? and classroom_id = ?')) {
              const userId = parseInt(params[0]);
              const classroomId = parseInt(params[1]);
              return db.user_classrooms.find(uc => uc.user_id === userId && uc.classroom_id === classroomId);
            }
            if (sqlNorm.includes('user_id = ?')) {
              const userId = parseInt(params[0]);
              const links = db.user_classrooms.filter(uc => uc.user_id === userId);
              return links.map(link => {
                const classroom = db.classrooms.find(c => c.id === link.classroom_id);
                return { ...link, ...classroom };
              });
            }
            return db.user_classrooms;
          }
          if (sqlNorm.includes('from requests')) {
            let results = db.requests;
            if (sqlNorm.includes('where recipient_group = ?')) {
              results = results.filter(r => r.recipient_group === params[0]);
            }
            if (sqlNorm.includes('where sender_id = ?')) {
              results = results.filter(r => r.sender_id === parseInt(params[0]));
            }
            if (sqlNorm.includes('where status = ?')) {
              results = results.filter(r => r.status === params[0]);
            }
            if (sqlNorm.includes('where id = ?')) {
              return results.find(r => r.id === parseInt(params[0])) || null;
            }
            if (sqlNorm.includes('count(*)')) {
              return { count: results.length };
            }
            return results;
          }
          if (sqlNorm.includes('from registration_requests')) {
            if (sqlNorm.includes('where username = ?')) {
              return db.registration_requests.find(r => r.username === params[0]);
            }
            if (sqlNorm.includes('where id = ?')) {
              return db.registration_requests.find(r => r.id === parseInt(params[0])) || null;
            }
            return db.registration_requests;
          }
          return null;
        },
        all: (...params) => {
          const db = readDb();
          if (sqlNorm.includes('from users')) {
            return [...db.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          }
          if (sqlNorm.includes('from classrooms')) {
            return [...db.classrooms].sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
          }
          if (sqlNorm.includes('from user_classrooms')) {
            let results = db.user_classrooms;
            if (sqlNorm.includes('user_id = ?')) {
              results = results.filter(uc => uc.user_id === parseInt(params[0]));
            }
            return results.map(link => {
              const classroom = db.classrooms.find(c => c.id === link.classroom_id);
              return { ...link, ...classroom };
            });
          }
          if (sqlNorm.includes('from requests')) {
            let results = db.requests;
            if (sqlNorm.includes('where recipient_group = ?')) {
              results = results.filter(r => r.recipient_group === params[0]);
            }
            if (sqlNorm.includes('where sender_id = ?')) {
              results = results.filter(r => r.sender_id === parseInt(params[0]));
            }
            if (sqlNorm.includes('where status = ?')) {
              results = results.filter(r => r.status === params[0]);
            }
            return sortRequests(results);
          }
          if (sqlNorm.includes('from registration_requests')) {
            return sortRequests(db.registration_requests);
          }
          return [];
        },
        run: (...params) => ({ changes: 0 }),
      };
    }

    if (lowerSql.startsWith('insert')) {
      return {
        run: (...params) => {
          const db = readDb();
          let lastInsertRowid;

          if (sqlNorm.includes('into users')) {
            const [username, password, email, role, full_name] = params;
            const nextId = db.users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
            const newUser = {
              id: nextId,
              username,
              password,
              email,
              role,
              full_name,
              is_active: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            db.users.push(newUser);
            lastInsertRowid = newUser.id;
          } else if (sqlNorm.includes('into classrooms')) {
            const [number, is_active] = params;
            const nextId = db.classrooms.reduce((max, c) => Math.max(max, c.id), 0) + 1;
            const newClassroom = {
              id: nextId,
              number,
              is_active: is_active || 1,
            };
            db.classrooms.push(newClassroom);
            lastInsertRowid = newClassroom.id;
          } else if (sqlNorm.includes('into user_classrooms')) {
            const [user_id, classroom_id] = params;
            const nextId = db.user_classrooms.reduce((max, uc) => Math.max(max, uc.id), 0) + 1;
            const newUserClassroom = {
              id: nextId,
              user_id,
              classroom_id,
              assigned_at: new Date().toISOString(),
            };
            db.user_classrooms.push(newUserClassroom);
            lastInsertRowid = newUserClassroom.id;
          } else if (sqlNorm.includes('into requests')) {
            const [sender_id, recipient_group, classroom_id, title, description, status] = params;
            const nextId = db.requests.reduce((max, r) => Math.max(max, r.id), 0) + 1;
            const newRequest = {
              id: nextId,
              sender_id,
              recipient_group,
              classroom_id,
              title,
              description,
              status: status || 'sent',
              created_at: new Date().toISOString(),
              processed_at: null,
              processed_by: null,
              admin_comment: null,
            };
            db.requests.push(newRequest);
            lastInsertRowid = newRequest.id;
          } else if (sqlNorm.includes('into registration_requests')) {
            const [username, password, email, full_name, classroom_ids, status] = params;
            const nextId = db.registration_requests.reduce((max, r) => Math.max(max, r.id), 0) + 1;
            const newRequest = {
              id: nextId,
              username,
              password,
              email,
              full_name,
              classroom_ids,
              status: status || 'pending',
              created_at: new Date().toISOString(),
              processed_at: null,
              processed_by: null,
            };
            db.registration_requests.push(newRequest);
            lastInsertRowid = newRequest.id;
          }

          writeDb(db);
          return { lastInsertRowid, changes: 1 };
        },
      };
    }

    if (lowerSql.startsWith('update')) {
      return {
        run: (...params) => {
          const db = readDb();
          let changes = 0;

          if (sqlNorm.includes('users set')) {
            const id = params[params.length - 1];
            const user = db.users.find(u => u.id === parseInt(id));
            if (user) {
              let paramIndex = 0;
              if (sqlNorm.includes('email = ?')) user.email = params[paramIndex++];
              if (sqlNorm.includes('role = ?')) user.role = params[paramIndex++];
              if (sqlNorm.includes('full_name = ?')) user.full_name = params[paramIndex++];
              if (sqlNorm.includes('is_active = ?')) user.is_active = params[paramIndex++];
              user.updated_at = new Date().toISOString();
              changes = 1;
            }
          } else if (sqlNorm.includes('registration_requests set')) {
            const id = params[params.length - 1];
            const request = db.registration_requests.find(r => r.id === parseInt(id));
            if (request) {
              let paramIndex = 0;
              if (sqlNorm.includes('status = ?')) request.status = params[paramIndex++];
              if (sqlNorm.includes('processed_at = ?')) request.processed_at = params[paramIndex++];
              if (sqlNorm.includes('processed_by = ?')) request.processed_by = params[paramIndex++];
              changes = 1;
            }
          } else if (sqlNorm.includes('requests set')) {
            const id = params[params.length - 1];
            const request = db.requests.find(r => r.id === parseInt(id));
            if (request) {
              let paramIndex = 0;
              if (sqlNorm.includes('recipient_group = ?')) request.recipient_group = params[paramIndex++];
              if (sqlNorm.includes('status = ?')) request.status = params[paramIndex++];
              if (sqlNorm.includes('admin_comment = ?')) request.admin_comment = params[paramIndex++];
              if (sqlNorm.includes('processed_at = ?')) request.processed_at = params[paramIndex++];
              if (sqlNorm.includes('processed_by = ?')) request.processed_by = params[paramIndex++];
              changes = 1;
            }
          }
          writeDb(db);
          return { changes };
        },
      };
    }

    if (lowerSql.startsWith('delete')) {
      return {
        run: (...params) => {
          const db = readDb();
          let changes = 0;

          if (sqlNorm.includes('from users')) {
            const id = parseInt(params[0]);
            const index = db.users.findIndex(u => u.id === id);
            if (index !== -1) {
              db.users.splice(index, 1);
              changes = 1;
            }
          } else if (sqlNorm.includes('from requests')) {
            const id = parseInt(params[0]);
            const index = db.requests.findIndex(r => r.id === id);
            if (index !== -1) {
              db.requests.splice(index, 1);
              changes = 1;
            }
          } else if (sqlNorm.includes('from user_classrooms')) {
            if (sqlNorm.includes('where user_id = ? and classroom_id = ?')) {
              const userId = parseInt(params[0]);
              const classroomId = parseInt(params[1]);
              const index = db.user_classrooms.findIndex(uc => uc.user_id === userId && uc.classroom_id === classroomId);
              if (index !== -1) {
                db.user_classrooms.splice(index, 1);
                changes = 1;
              }
            } else if (sqlNorm.includes('user_id = ?')) {
              const userId = parseInt(params[0]);
              const before = db.user_classrooms.length;
              db.user_classrooms = db.user_classrooms.filter(uc => uc.user_id !== userId);
              changes = before - db.user_classrooms.length;
            } else if (sqlNorm.includes('classroom_id = ?')) {
              const classroomId = parseInt(params[0]);
              const before = db.user_classrooms.length;
              db.user_classrooms = db.user_classrooms.filter(uc => uc.classroom_id !== classroomId);
              changes = before - db.user_classrooms.length;
            }
          } else if (sqlNorm.includes('from classrooms')) {
            const id = parseInt(params[0]);
            const index = db.classrooms.findIndex(c => c.id === id);
            if (index !== -1) {
              db.classrooms.splice(index, 1);
              changes = 1;
            }
            db.user_classrooms = db.user_classrooms.filter(uc => uc.classroom_id !== id);
          }
          writeDb(db);
          return { changes };
        },
      };
    }

    // Default
    return {
      get: () => null,
      all: () => [],
      run: () => ({ changes: 0 }),
    };
  },

  pragma: (setting) => {
    // Ignored for JSON-based DB
    console.log(`Pragma: ${setting}`);
  },

  close: () => {},
};

export default db;
