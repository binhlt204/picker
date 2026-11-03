import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';

const router = Router();

// GET /api/sessions - Danh sách phiên
router.get('/', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const db = getDB();

    let query = `
      SELECT s.*, c.name as classroom_name, q.title as quiz_title,
             (SELECT COUNT(*) FROM students WHERE classroom_id = s.classroom_id) as total_students,
             (SELECT COUNT(*) FROM questions WHERE quiz_id = s.quiz_id) as total_questions
      FROM exam_sessions s
      JOIN classrooms c ON s.classroom_id = c.id
      JOIN quizzes q ON s.quiz_id = q.id
    `;
    const params: any[] = [];

    if (status) {
      query += ` WHERE s.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC`;

    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id - Chi tiết phiên
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const session = db.prepare(`
      SELECT s.*, c.name as classroom_name, q.title as quiz_title
      FROM exam_sessions s
      JOIN classrooms c ON s.classroom_id = c.id
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE s.id = ?
    `).get(req.params.id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const students = db.prepare(
      'SELECT * FROM students WHERE classroom_id = ? ORDER BY card_id ASC'
    ).all(session.classroom_id);

    const questions = db.prepare(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_order ASC'
    ).all(session.quiz_id);

    res.json({
      ...session,
      students,
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions - Tạo phiên mới
router.post('/', (req: Request, res: Response) => {
  try {
    const { classroom_id, quiz_id } = req.body;
    if (!classroom_id || !quiz_id) {
      return res.status(400).json({ error: 'classroom_id and quiz_id are required' });
    }

    const db = getDB();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO exam_sessions (id, classroom_id, quiz_id, status, current_question_order)
      VALUES (?, ?, ?, 'WAITING', 0)
    `).run(id, classroom_id, quiz_id);

    const created = db.prepare(`
      SELECT s.*, c.name as classroom_name, q.title as quiz_title
      FROM exam_sessions s
      JOIN classrooms c ON s.classroom_id = c.id
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE s.id = ?
    `).get(id);

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/sessions/:id/status - Cập nhật trạng thái phiên
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['WAITING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be WAITING, ACTIVE or COMPLETED' });
    }

    const db = getDB();
    const result = db.prepare('UPDATE exam_sessions SET status = ? WHERE id = ?').run(status, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id/results - Bảng điểm chi tiết phiên thi
router.get('/:id/results', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const session = db.prepare(`
      SELECT s.*, c.name as classroom_name, q.title as quiz_title
      FROM exam_sessions s
      JOIN classrooms c ON s.classroom_id = c.id
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE s.id = ?
    `).get(req.params.id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const students = db.prepare(
      'SELECT * FROM students WHERE classroom_id = ? ORDER BY card_id ASC'
    ).all(session.classroom_id) as any[];

    const questions = db.prepare(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_order ASC'
    ).all(session.quiz_id) as any[];

    const answers = db.prepare(
      'SELECT * FROM session_answers WHERE session_id = ?'
    ).all(req.params.id) as any[];

    // Map answers by student_id and question_id
    const answerMap: Record<string, Record<string, any>> = {};
    answers.forEach((ans) => {
      if (!answerMap[ans.student_id]) {
        answerMap[ans.student_id] = {};
      }
      answerMap[ans.student_id][ans.question_id] = ans;
    });

    const studentResults = students.map((st) => {
      let correctCount = 0;
      const questionAnswers: Record<string, any> = {};

      questions.forEach((q) => {
        const studentAns = answerMap[st.id]?.[q.id];
        if (studentAns) {
          questionAnswers[q.id] = {
            selected: studentAns.selected_option,
            isCorrect: studentAns.is_correct === 1,
          };
          if (studentAns.is_correct === 1) {
            correctCount++;
          }
        } else {
          questionAnswers[q.id] = null;
        }
      });

      const totalQ = questions.length;
      const score10 = totalQ > 0 ? Number(((correctCount / totalQ) * 10).toFixed(1)) : 0;

      return {
        id: st.id,
        card_id: st.card_id,
        full_name: st.full_name,
        correctCount,
        totalQuestions: totalQ,
        score: score10,
        answers: questionAnswers,
      };
    });

    // Sắp xếp rank theo điểm giảm dần
    const sorted = [...studentResults].sort((a, b) => b.score - a.score);
    const rankedResults = studentResults.map((st) => ({
      ...st,
      rank: sorted.findIndex((s) => s.id === st.id) + 1,
    }));

    // Tổng hợp thống kê
    const scores = studentResults.map((s) => s.score);
    const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const correctRates = studentResults.map((s) => (s.totalQuestions > 0 ? (s.correctCount / s.totalQuestions) * 100 : 0));
    const avgRate = correctRates.length > 0 ? Number((correctRates.reduce((a, b) => a + b, 0) / correctRates.length).toFixed(0)) : 0;

    res.json({
      session,
      questions,
      students: rankedResults,
      summary: {
        totalStudents: students.length,
        avgScore,
        avgRate,
        maxScore,
        minScore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
