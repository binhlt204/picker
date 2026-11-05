import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';
import { deleteQuiz } from '../services/cascade';

const router = Router();

// GET /api/quizzes - Danh sách đề
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const quizzes = db.prepare(`
      SELECT q.*, COUNT(qu.id) as question_count
      FROM quizzes q
      LEFT JOIN questions qu ON q.id = qu.quiz_id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `).all();
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/quizzes/:id - Chi tiết đề + danh sách câu hỏi
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const questions = db.prepare(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_order ASC'
    ).all(req.params.id);
    res.json({ ...(quiz as object), questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/quizzes - Tạo đề mới
router.post('/', (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    const db = getDB();
    const id = uuidv4();
    db.prepare('INSERT INTO quizzes (id, title) VALUES (?, ?)').run(id, title.trim());
    const newQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
    res.status(201).json(newQuiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/quizzes/:id - Sửa tiêu đề
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    const db = getDB();
    const result = db.prepare('UPDATE quizzes SET title = ? WHERE id = ?').run(title.trim(), req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/quizzes/:id - Xóa đề
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const changes = deleteQuiz(String(req.params.id));
    if (changes === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
