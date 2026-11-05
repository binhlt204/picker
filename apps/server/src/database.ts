import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/pickball.db');

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');       // Performance tốt hơn
    db.pragma('foreign_keys = ON');        // Bật foreign key constraint

    // Chạy migration / khởi tạo bảng
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      card_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      UNIQUE(classroom_id, card_id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_order INTEGER NOT NULL,
      content TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT CHECK (correct_option IN ('A','B','C','D')) NOT NULL,
      time_limit INTEGER DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id),
      quiz_id TEXT NOT NULL REFERENCES quizzes(id),
      status TEXT DEFAULT 'WAITING' CHECK (status IN ('WAITING','ACTIVE','COMPLETED')),
      current_question_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      student_id TEXT NOT NULL REFERENCES students(id),
      selected_option TEXT CHECK (selected_option IN ('A','B','C','D')) NOT NULL,
      is_correct INTEGER NOT NULL,
      submitted_at TEXT DEFAULT (datetime('now')),
      UNIQUE(session_id, question_id, student_id)
    );

    -- Tài khoản đăng nhập web (role: admin | teacher, status: active | pending | disabled)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin','teacher')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','disabled')),
      created_at TEXT DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    -- Token đặt lại mật khẩu (chỉ lưu hash của token, dùng 1 lần, có hạn)
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
    CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_answers_session ON session_answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_answers_question ON session_answers(question_id);
  `);

  console.log('✅ Database initialized at:', DB_PATH);
}
