import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';
import { deleteClassroom } from '../services/cascade';
import { classroomParam, ownerClause } from '../services/access';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = Router();

// Mọi route có :id đều phải thuộc về tài khoản đang đăng nhập (admin: tất cả)
router.param('id', classroomParam);

const CARD_SCRIPT = path.resolve(__dirname, '../../../../scripts/generate-aruco-cards.py');
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

// GET /api/classrooms/:id/cards/pdf - Tải PDF thẻ in theo danh sách học sinh của lớp
router.get('/:id/cards/pdf', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    const students = db
      .prepare('SELECT card_id, full_name FROM students WHERE classroom_id = ? ORDER BY card_id ASC')
      .all(req.params.id) as Array<{ card_id: number; full_name: string }>;
    if (students.length === 0) {
      return res.status(400).json({ error: 'Lớp chưa có học sinh nào để in thẻ' });
    }

    const outPath = path.join(os.tmpdir(), `lbhouse_cards_${uuidv4()}.pdf`);
    const child = spawn(PYTHON_BIN, [CARD_SCRIPT, '--input', '-', '--output', outPath], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: `Không chạy được Python (${PYTHON_BIN}): ${err.message}` });
    });
    child.on('close', (code) => {
      if (code !== 0 || !fs.existsSync(outPath)) {
        if (!res.headersSent) res.status(500).json({ error: 'Sinh PDF thẻ thất bại', detail: stderr.trim() });
        return;
      }
      res.download(outPath, `the_trac_nghiem_${classroom.name}.pdf`, () => {
        fs.unlink(outPath, () => {});
      });
    });

    child.stdin.end(JSON.stringify({ classroom: classroom.name, students }), 'utf-8');
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/classrooms - Danh sách tất cả lớp
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const own = ownerClause(req.user, 'c');
    const classrooms = db
      .prepare(`SELECT c.* FROM classrooms c ${own.sql ? 'WHERE ' + own.sql : ''} ORDER BY c.created_at DESC`)
      .all(...own.params);
    res.json(classrooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/classrooms/:id - Chi tiết lớp + danh sách học sinh
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    const students = db.prepare('SELECT * FROM students WHERE classroom_id = ? ORDER BY card_id ASC').all(req.params.id);
    res.json({ ...(classroom as object), students });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/classrooms - Tạo lớp mới
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    const db = getDB();
    const id = uuidv4();
    db.prepare('INSERT INTO classrooms (id, name, owner_id) VALUES (?, ?, ?)').run(id, name.trim(), req.user!.id);
    const newClassroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id);
    res.status(201).json(newClassroom);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/classrooms/:id - Đổi tên lớp
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    const db = getDB();
    const result = db.prepare('UPDATE classrooms SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    const updated = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/classrooms/:id - Xóa lớp
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const changes = deleteClassroom(String(req.params.id));
    if (changes === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
