import { Router, Request, Response } from 'express';
import { getDB } from '../database';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/admin/overview - Thống kê tổng quan server và database
router.get('/overview', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/lbhouse.db');

    let dbSizeBytes = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeBytes = stat.size;
    } catch {}

    const tableNames = ['users', 'classrooms', 'students', 'quizzes', 'questions', 'exam_sessions', 'session_answers'];
    const counts: Record<string, number> = {};

    tableNames.forEach((table) => {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any;
        counts[table] = row ? row.count : 0;
      } catch {
        counts[table] = 0;
      }
    });

    const mem = process.memoryUsage();

    res.json({
      status: 'online',
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        memoryRssMb: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
        memoryHeapMb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
        port: process.env.PORT || 3001,
      },
      database: {
        path: dbPath,
        sizeKb: Math.round(dbSizeBytes / 1024 * 10) / 10,
        journalMode: 'WAL',
        foreignKeys: 'ON',
      },
      counts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/tables/:table - Lấy dữ liệu của 1 bảng bất kỳ
router.get('/tables/:table', (req: Request, res: Response) => {
  try {
    const allowed = ['classrooms', 'students', 'quizzes', 'questions', 'exam_sessions', 'session_answers'];
    const tableName = req.params.table as string;

    if (!allowed.includes(tableName)) {
      return res.status(400).json({ error: 'Bảng không hợp lệ' });
    }

    const db = getDB();
    const rows = db.prepare(`SELECT * FROM ${tableName} LIMIT 100`).all();
    const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];

    res.json({
      table: tableName,
      total: rows.length,
      columns,
      rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/reset-seed - Reset dữ liệu mẫu (1 lớp, 15 HS, 5 câu hỏi)
router.post('/reset-seed', (req: Request, res: Response) => {
  try {
    const db = getDB();

    const transaction = db.transaction(() => {
      // 1. Tạo lớp học
      const classId = uuidv4();
      // Dữ liệu mẫu thuộc về admin đang thao tác
      const ownerId = req.user!.id;
      db.prepare('INSERT INTO classrooms (id, name, owner_id) VALUES (?, ?, ?)').run(
        classId,
        'Lớp 10A1 - Năm học 2026',
        ownerId
      );

      // 2. Tạo 15 học sinh
      const students = [
        'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Dũng',
        'Hoàng Thu Giang', 'Vũ Đức Hải', 'Đặng Ngọc Khánh', 'Bùi Tuấn Linh',
        'Đỗ Phương Mai', 'Ngô Gia Nam', 'Dương Thu Oanh', 'Lý Quốc Phong',
        'Mai Hồng Quân', 'Tạ Thuỳ Trang', 'Võ Thành Vinh'
      ];
      const insertStudent = db.prepare('INSERT INTO students (id, classroom_id, card_id, full_name) VALUES (?, ?, ?, ?)');
      students.forEach((name, i) => {
        insertStudent.run(uuidv4(), classId, i + 1, name);
      });

      // 3. Tạo đề thi
      const quizId = uuidv4();
      db.prepare('INSERT INTO quizzes (id, title, owner_id) VALUES (?, ?, ?)').run(
        quizId,
        'Khảo sát Toán học & Khoa học Tự nhiên',
        ownerId
      );

      // 4. Tạo 5 câu hỏi
      const questions = [
        {
          content: 'Phương trình bậc hai x² - 5x + 6 = 0 có tập nghiệm là gì?',
          a: 'x = 1 và x = 6', b: 'x = 2 và x = 3', c: 'x = -2 và x = -3', d: 'x = 1 và x = -6',
          correct: 'B', time: 30
        },
        {
          content: 'Hành tinh nào trong hệ Mặt Trời có kích thước lớn nhất?',
          a: 'Sao Hỏa', b: 'Sao Thổ', c: 'Sao Mộc', d: 'Sao Kim',
          correct: 'C', time: 25
        },
        {
          content: 'Công thức hóa học của nước cất là gì?',
          a: 'H2O', b: 'CO2', c: 'NaCl', d: 'H2SO4',
          correct: 'A', time: 20
        },
        {
          content: 'Trong chuyển động thẳng đều, đại lượng nào sau đây không đổi theo thời gian?',
          a: 'Quãng đường', b: 'Vận tốc', c: 'Tọa độ', d: 'Gia tốc',
          correct: 'B', time: 30
        },
        {
          content: 'Việt Nam có đường bờ biển dài xấp xỉ bao nhiêu km?',
          a: '2.360 km', b: '3.000 km', c: '3.260 km', d: '4.120 km',
          correct: 'C', time: 30
        }
      ];

      const insertQuestion = db.prepare(`
        INSERT INTO questions (id, quiz_id, question_order, content, option_a, option_b, option_c, option_d, correct_option, time_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q, i) => {
        insertQuestion.run(uuidv4(), quizId, i + 1, q.content, q.a, q.b, q.c, q.d, q.correct, q.time);
      });

      // 5. Tạo 1 phiên thi mẫu
      const sessionId = uuidv4();
      db.prepare("INSERT INTO exam_sessions (id, classroom_id, quiz_id, status, current_question_order, owner_id) VALUES (?, ?, ?, 'WAITING', 0, ?)").run(
        sessionId, classId, quizId, ownerId
      );
    });

    transaction();
    res.json({ success: true, message: 'Đã nạp thêm dữ liệu mẫu thành công!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
