import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';
import { requireAuth } from '../auth/middleware';
import { canAccessClassroom, canAccessQuiz, ownerClause, sessionParam } from '../services/access';
import http from 'http';
import { getOrCreateActiveSession, submitAnswers, getTimerStateForSession, loadTimerSettings } from '../socket/sessionHandler';

const router = Router();

// Mọi route có :id đều phải thuộc về tài khoản đang đăng nhập (admin: tất cả)
router.param('id', sessionParam);

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
    const conditions: string[] = [];

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    // Giáo viên chỉ thấy phiên của mình, admin thấy tất cả
    const own = ownerClause(req.user, 's');
    if (own.sql) {
      conditions.push(own.sql);
      params.push(...own.params);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
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
    `).get((req.params.id as string)) as any;

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
      timer_settings: loadTimerSettings(session.id),
      students,
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions - Tạo phiên mới
router.post('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { classroom_id, quiz_id } = req.body;
    if (!classroom_id || !quiz_id) {
      return res.status(400).json({ error: 'classroom_id and quiz_id are required' });
    }

    // Chỉ được tạo phiên từ lớp và bộ đề của chính mình (admin: bất kỳ)
    if (!canAccessClassroom(req.user, String(classroom_id)) || !canAccessQuiz(req.user, String(quiz_id))) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học hoặc bộ đề' });
    }

    const db = getDB();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO exam_sessions (id, classroom_id, quiz_id, status, current_question_order, owner_id)
      VALUES (?, ?, ?, 'WAITING', 0, ?)
    `).run(id, classroom_id, quiz_id, req.user!.id);

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
router.patch('/:id/status', requireAuth, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['WAITING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be WAITING, ACTIVE or COMPLETED' });
    }

    const db = getDB();
    const result = db.prepare('UPDATE exam_sessions SET status = ? WHERE id = ?').run(status, (req.params.id as string));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get((req.params.id as string));
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id/results - Bảng điểm chi tiết phiên thi
router.get('/:id/results', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDB();
    const session = db.prepare(`
      SELECT s.*, c.name as classroom_name, q.title as quiz_title
      FROM exam_sessions s
      JOIN classrooms c ON s.classroom_id = c.id
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE s.id = ?
    `).get((req.params.id as string)) as any;

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
    ).all((req.params.id as string)) as any[];

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

// GET /api/sessions/:id/current-question
router.get('/:id/current-question', (req: Request, res: Response) => {
  try {
    const session = getOrCreateActiveSession((req.params.id as string));
    if (!session || !session.currentQuestionId) {
      return res.status(404).json({ error: 'No active question found' });
    }
    const db = getDB();
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const totalQ = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?').get(question.quiz_id) as any;
    const examSession = db.prepare('SELECT classroom_id FROM exam_sessions WHERE id = ?').get((req.params.id as string)) as any;
    const totalStudents = examSession
      ? (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(examSession.classroom_id) as any)?.count || 0
      : 0;

    const distribution = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(session.answers).forEach((ans: any) => {
      if (ans in distribution) distribution[ans as keyof typeof distribution]++;
    });

    res.json({
      questionId: question.id,
      questionOrder: question.question_order,
      content: question.content,
      optionA: question.option_a,
      optionB: question.option_b,
      optionC: question.option_c,
      optionD: question.option_d,
      correctOption: question.correct_option,
      // Đồng hồ chung do server giữ: timeLimit (giây | null), endsAt (ms | null), serverNow (ms)
      ...getTimerStateForSession(req.params.id as string),
      timerSettings: loadTimerSettings(req.params.id as string),
      totalQuestions: totalQ?.count || 0,
      isLocked: session.isLocked,
      submittedCardIds: Object.keys(session.answers).map(Number),
      answerDistribution: distribution,
      answers: session.answers,
      totalStudents,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/submit-card
router.post('/:id/submit-card', (req: Request, res: Response) => {
  try {
    const { cardId, answer } = req.body;
    if (typeof cardId !== 'number' || !answer) {
      return res.status(400).json({ error: 'cardId (number) and answer (string) required' });
    }
    const result = submitAnswers((req.params.id as string), [{ cardId, answer }]);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/scan-frame
router.post('/:id/scan-frame', async (req: Request, res: Response) => {
  try {
    let imageBuffer: Buffer | null = null;
    if (Buffer.isBuffer(req.body)) {
      imageBuffer = req.body;
    } else if (req.body && req.body.image) {
      imageBuffer = Buffer.from(req.body.image, 'base64');
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: 'Image data missing (send raw image bytes or base64 JSON)' });
    }

    const detectorReq = http.request(
      'http://127.0.0.1:5001/detect',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': imageBuffer.length,
        },
      },
      (detectorRes) => {
        let data = '';
        detectorRes.on('data', (chunk) => (data += chunk));
        detectorRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const markers = parsed.results || [];
            if (markers.length > 0) {
              const submission = submitAnswers(
                (req.params.id as string),
                markers.map((m: any) => ({ cardId: m.cardId, answer: m.answer }))
              );
              return res.json({
                success: true,
                detectedCount: markers.length,
                markers,
                accepted: submission.accepted,
              });
            }
            res.json({ success: true, detectedCount: 0, markers: [], accepted: [] });
          } catch (e: any) {
            res.status(500).json({ error: 'Failed to parse detector response', detail: e.message });
          }
        });
      }
    );

    detectorReq.on('error', (err) => {
      res.status(502).json({ error: 'Detector service unavailable on 5001', detail: err.message });
    });

    detectorReq.write(imageBuffer);
    detectorReq.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
