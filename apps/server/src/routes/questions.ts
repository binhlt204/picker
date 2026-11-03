import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';

const router = Router();

// GET /api/quizzes/:quizId/questions - Danh sách câu hỏi trong đề
router.get('/quizzes/:quizId/questions', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const questions = db.prepare(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_order ASC'
    ).all(req.params.quizId);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/quizzes/:quizId/questions - Thêm câu hỏi
router.post('/quizzes/:quizId/questions', (req: Request, res: Response) => {
  try {
    const { content, option_a, option_b, option_c, option_d, correct_option, time_limit } = req.body;
    const { quizId } = req.params;

    if (!content || !option_a || !option_b || !option_c || !option_d || !correct_option) {
      return res.status(400).json({ error: 'Thiếu trường nội dung hoặc các đáp án A/B/C/D' });
    }

    if (!['A', 'B', 'C', 'D'].includes(correct_option)) {
      return res.status(400).json({ error: 'Đáp án đúng phải là A, B, C hoặc D' });
    }

    const db = getDB();

    // Lấy số thứ tự câu hỏi tiếp theo
    const lastQ = db.prepare(
      'SELECT MAX(question_order) as max_order FROM questions WHERE quiz_id = ?'
    ).get(quizId) as any;
    const nextOrder = (lastQ?.max_order || 0) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO questions (
        id, quiz_id, question_order, content,
        option_a, option_b, option_c, option_d,
        correct_option, time_limit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      quizId,
      nextOrder,
      content.trim(),
      option_a.trim(),
      option_b.trim(),
      option_c.trim(),
      option_d.trim(),
      correct_option,
      time_limit ? parseInt(time_limit, 10) : 30
    );

    const created = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/questions/:id - Sửa câu hỏi
router.put('/questions/:id', (req: Request, res: Response) => {
  try {
    const { content, option_a, option_b, option_c, option_d, correct_option, time_limit } = req.body;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (correct_option && !['A', 'B', 'C', 'D'].includes(correct_option)) {
      return res.status(400).json({ error: 'Đáp án đúng phải là A, B, C hoặc D' });
    }

    db.prepare(`
      UPDATE questions SET
        content = ?,
        option_a = ?,
        option_b = ?,
        option_c = ?,
        option_d = ?,
        correct_option = ?,
        time_limit = ?
      WHERE id = ?
    `).run(
      content !== undefined ? content.trim() : existing.content,
      option_a !== undefined ? option_a.trim() : existing.option_a,
      option_b !== undefined ? option_b.trim() : existing.option_b,
      option_c !== undefined ? option_c.trim() : existing.option_c,
      option_d !== undefined ? option_d.trim() : existing.option_d,
      correct_option !== undefined ? correct_option : existing.correct_option,
      time_limit !== undefined ? parseInt(time_limit, 10) : existing.time_limit,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/questions/:id - Xóa câu hỏi
router.delete('/questions/:id', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const result = db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/quizzes/:quizId/questions/reorder - Sắp xếp lại thứ tự câu hỏi
router.put('/quizzes/:quizId/questions/reorder', (req: Request, res: Response) => {
  try {
    const { orderedIds } = req.body; // array of question IDs in new order
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required' });
    }

    const db = getDB();
    const updateStmt = db.prepare('UPDATE questions SET question_order = ? WHERE id = ? AND quiz_id = ?');

    const transaction = db.transaction(() => {
      orderedIds.forEach((id, index) => {
        updateStmt.run(index + 1, id, req.params.quizId);
      });
    });

    transaction();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
