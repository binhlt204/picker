import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';

const router = Router();

// GET /api/classrooms - Danh sách tất cả lớp
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const classrooms = db.prepare('SELECT * FROM classrooms ORDER BY created_at DESC').all();
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
    db.prepare('INSERT INTO classrooms (id, name) VALUES (?, ?)').run(id, name.trim());
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
    const db = getDB();
    const result = db.prepare('DELETE FROM classrooms WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
