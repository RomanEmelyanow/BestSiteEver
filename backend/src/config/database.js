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

// Инициализируем базу данных если файла нет
if (!existsSync(dbPath)) {
  const initialData = {
    users: [],
    sessions: [],
    audit_logs: [],
    registration_requests: [],
    classrooms: [
      { id: 1, number: '101', is_active: 1 },
      { id: 2, number: '102', is_active: 1 },
      { id: 3, number: '103', is_active: 1 },
      { id: 4, number: '104', is_active: 1 },
      { id: 5, number: '105', is_active: 1 },
      { id: 6, number: '106', is_active: 1 },
      { id: 7, number: '107', is_active: 1 },
      { id: 8, number: '108', is_active: 1 },
      { id: 9, number: '109', is_active: 1 },
      { id: 10, number: '110', is_active: 1 },
      { id: 11, number: '111', is_active: 1 },
      { id: 12, number: '112', is_active: 1 },
      { id: 13, number: '113', is_active: 1 },
      { id: 14, number: '114', is_active: 1 },
      { id: 15, number: '115', is_active: 1 },
      { id: 16, number: '201', is_active: 1 },
      { id: 17, number: '202', is_active: 1 },
      { id: 18, number: '203', is_active: 1 },
      { id: 19, number: '204', is_active: 1 },
      { id: 20, number: '205', is_active: 1 },
      { id: 21, number: '206', is_active: 1 },
      { id: 22, number: '207', is_active: 1 },
      { id: 23, number: '208', is_active: 1 },
      { id: 24, number: '209', is_active: 1 },
      { id: 25, number: '210', is_active: 1 },
      { id: 26, number: '211', is_active: 1 },
      { id: 27, number: '212', is_active: 1 },
      { id: 28, number: '213', is_active: 1 },
      { id: 29, number: '214', is_active: 1 },
      { id: 30, number: '215', is_active: 1 },
      { id: 31, number: '301', is_active: 1 },
      { id: 32, number: '302', is_active: 1 },
      { id: 33, number: '303', is_active: 1 },
      { id: 34, number: '304', is_active: 1 },
      { id: 35, number: '305', is_active: 1 },
      { id: 36, number: '306', is_active: 1 },
      { id: 37, number: '307', is_active: 1 },
      { id: 38, number: '308', is_active: 1 },
      { id: 39, number: '309', is_active: 1 },
      { id: 40, number: '310', is_active: 1 },
      { id: 41, number: '311', is_active: 1 },
      { id: 42, number: '312', is_active: 1 },
      { id: 43, number: '313', is_active: 1 },
      { id: 44, number: '314', is_active: 1 },
      { id: 45, number: '315', is_active: 1 },
    ],
    user_classrooms: [],
    requests: [],
  };
  writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
}

// Вспомогательные функции для работы с базой данных
const readDb = () => {
  try {
    const data = readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure all required arrays exist
    parsed.users = parsed.users || [];
    parsed.sessions = parsed.sessions || [];
    parsed.audit_logs = parsed.audit_logs || [];
    parsed.registration_requests = parsed.registration_requests || [];
    parsed.classrooms = parsed.classrooms || [];
    parsed.user_classrooms = parsed.user_classrooms || [];
    parsed.requests = parsed.requests || [];
    return parsed;
  } catch (err) {
    console.error('Error reading database:', err);
    return { users: [], sessions: [], audit_logs: [], registration_requests: [], classrooms: [], user_classrooms: [], requests: [] };
  }
};

const writeDb = (data) => {
  try {
    writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing database:', err);
  }
};

// Обертка для имитации better-sqlite3 API
const db = {
  prepare: (sql) => {
    // Парсим SQL для определения операции
    const lowerSql = sql.toLowerCase().trim();

    if (lowerSql.startsWith('select')) {
      return {
        get: (...params) => {
          const db = readDb();
          if (lowerSql.includes('from users')) {
            if (lowerSql.includes('where username = ?')) {
              return db.users.find(u => u.username === params[0]);
            }
            if (lowerSql.includes('where id = ?')) {
              return db.users.find(u => u.id === parseInt(params[0]));
            }
            if (lowerSql.includes('order by created_at desc')) {
              return db.users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return db.users;
          }
          if (lowerSql.includes('from audit_logs')) {
            let logs = db.audit_logs;
            // Apply filters from params if needed
            return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, params[params.length - 1] || 100);
          }
          if (lowerSql.includes('from classrooms')) {
            if (lowerSql.includes('where is_active = ?')) {
              return db.classrooms.filter(c => c.is_active === 1);
            }
            if (lowerSql.includes('where id = ?')) {
              return db.classrooms.find(c => c.id === parseInt(params[0]));
            }
            return db.classrooms;
          }
          if (lowerSql.includes('from user_classrooms')) {
            if (lowerSql.includes('where user_id = ?')) {
              const userId = parseInt(params[0]);
              const links = db.user_classrooms.filter(uc => uc.user_id === userId);
              // Join with classrooms
              return links.map(link => {
                const classroom = db.classrooms.find(c => c.id === link.classroom_id);
                return { ...link, ...classroom };
              });
            }
            if (lowerSql.includes('where user_id = ? and classroom_id = ?')) {
              const userId = parseInt(params[0]);
              const classroomId = parseInt(params[1]);
              return db.user_classrooms.find(uc => uc.user_id === userId && uc.classroom_id === classroomId);
            }
            return db.user_classrooms;
          }
          if (lowerSql.includes('from requests')) {
            let results = db.requests;
            if (lowerSql.includes('where recipient_group = ?')) {
              results = results.filter(r => r.recipient_group === params[0]);
            }
            if (lowerSql.includes('where sender_id = ?')) {
              results = results.filter(r => r.sender_id === parseInt(params[0]));
            }
            if (lowerSql.includes('where status = ?')) {
              results = results.filter(r => r.status === params[0]);
            }
            if (lowerSql.includes('where id = ?')) {
              results = results.filter(r => r.id === parseInt(params[0]));
            }
            if (lowerSql.includes('order by created_at desc')) {
              results = results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return results;
          }
          return null;
        },
        all: (...params) => {
          const db = readDb();
          if (lowerSql.includes('from users')) {
            return db.users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          }
          if (lowerSql.includes('from audit_logs')) {
            return db.audit_logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          }
          if (lowerSql.includes('from classrooms')) {
            const classrooms = db.classrooms || [];
            // Sort by numeric value of number
            return classrooms.sort((a, b) => {
              const numA = parseInt(a.number) || 0;
              const numB = parseInt(b.number) || 0;
              return numA - numB;
            });
          }
          if (lowerSql.includes('from user_classrooms')) {
            let results = db.user_classrooms;
            if (lowerSql.includes('where user_id = ?')) {
              results = results.filter(uc => uc.user_id === parseInt(params[0]));
            }
            // Join with classrooms
            return results.map(link => {
              const classroom = db.classrooms.find(c => c.id === link.classroom_id);
              return { ...link, ...classroom };
            });
          }
          if (lowerSql.includes('from requests')) {
            let results = db.requests;
            if (lowerSql.includes('where recipient_group = ?')) {
              return results.filter(r => r.recipient_group === params[0]).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            if (lowerSql.includes('where sender_id = ?')) {
              return results.filter(r => r.sender_id === parseInt(params[0])).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            if (lowerSql.includes('where status = ?')) {
              return results.filter(r => r.status === params[0]).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

          if (lowerSql.includes('into users')) {
            const [username, password, email, role, full_name] = params;
            const newUser = {
              id: db.users.length + 1,
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
          } else if (lowerSql.includes('into audit_logs')) {
            const [user_id, action, entity_type, entity_id, details] = params;
            const newLog = {
              id: db.audit_logs.length + 1,
              user_id,
              action,
              entity_type,
              entity_id,
              details,
              ip_address: params[5] || null,
              created_at: new Date().toISOString(),
            };
            db.audit_logs.push(newLog);
            lastInsertRowid = newLog.id;
          } else if (lowerSql.includes('into classrooms')) {
            const [number, is_active] = params;
            const newClassroom = {
              id: db.classrooms.length + 1,
              number,
              is_active: is_active || 1,
            };
            db.classrooms.push(newClassroom);
            lastInsertRowid = newClassroom.id;
          } else if (lowerSql.includes('into user_classrooms')) {
            const [user_id, classroom_id] = params;
            const newUserClassroom = {
              id: db.user_classrooms.length + 1,
              user_id,
              classroom_id,
              assigned_at: new Date().toISOString(),
            };
            db.user_classrooms.push(newUserClassroom);
            lastInsertRowid = newUserClassroom.id;
          } else if (lowerSql.includes('into requests')) {
            const [sender_id, recipient_group, classroom_id, title, description, status] = params;
            const newRequest = {
              id: db.requests.length + 1,
              sender_id,
              recipient_group,
              classroom_id,
              title,
              description,
              status: status || 'pending',
              created_at: new Date().toISOString(),
              processed_at: null,
              processed_by: null,
              admin_comment: null,
            };
            db.requests.push(newRequest);
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

          if (lowerSql.includes('users set')) {
            const id = params[params.length - 1];
            const userIndex = db.users.findIndex(u => u.id === parseInt(id));
            if (userIndex !== -1) {
              // Update fields based on SQL
              const user = db.users[userIndex];
              // For simplicity, just update known fields from params
              if (lowerSql.includes('email = ?')) user.email = params[0];
              if (lowerSql.includes('role = ?')) user.role = params[0];
              if (lowerSql.includes('full_name = ?')) user.full_name = params[0];
              if (lowerSql.includes('is_active = ?')) user.is_active = params[0];
              user.updated_at = new Date().toISOString();
              changes = 1;
            }
          } else if (lowerSql.includes('requests set')) {
            const id = params[params.length - 1];
            const requestIndex = db.requests.findIndex(r => r.id === parseInt(id));
            if (requestIndex !== -1) {
              const request = db.requests[requestIndex];
              // Update fields based on SQL
              if (lowerSql.includes('status = ?')) request.status = params[0];
              if (lowerSql.includes('processed_at = ?')) request.processed_at = params[0];
              if (lowerSql.includes('processed_by = ?')) request.processed_by = params[0];
              if (lowerSql.includes('admin_comment = ?')) request.admin_comment = params[0];
              if (lowerSql.includes('updated_at = ?')) request.updated_at = params[0];
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

          if (lowerSql.includes('from users')) {
            const id = parseInt(params[0]);
            const index = db.users.findIndex(u => u.id === id);
            if (index !== -1) {
              db.users.splice(index, 1);
              changes = 1;
            }
          } else if (lowerSql.includes('from user_classrooms')) {
            if (lowerSql.includes('where user_id = ? and classroom_id = ?')) {
              const userId = parseInt(params[0]);
              const classroomId = parseInt(params[1]);
              const index = db.user_classrooms.findIndex(uc => uc.user_id === userId && uc.classroom_id === classroomId);
              if (index !== -1) {
                db.user_classrooms.splice(index, 1);
                changes = 1;
              }
            }
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