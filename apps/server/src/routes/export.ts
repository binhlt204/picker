import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { getDB } from '../database';
import { requireAuth } from '../auth/middleware';
import { sessionParam } from '../services/access';

const router = Router();

router.param('id', sessionParam);

router.get('/sessions/:id/results/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const { format = 'xlsx' } = req.query;
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

    const answerMap: Record<string, Record<string, any>> = {};
    answers.forEach((ans) => {
      if (!answerMap[ans.student_id]) {
        answerMap[ans.student_id] = {};
      }
      answerMap[ans.student_id][ans.question_id] = ans;
    });

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LB HOUSE System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Bảng điểm');

    // Title rows
    worksheet.mergeCells('A1', `${String.fromCharCode(68 + Math.min(questions.length, 20))}1`);
    worksheet.getCell('A1').value = `BẢNG ĐIỂM KIỂM TRA TRẮC NGHIỆM - ${session.quiz_title}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Lớp: ${session.classroom_name}`;
    worksheet.getCell('B2').value = `Ngày tạo: ${session.created_at}`;

    // Table Header
    const headers = ['Số thẻ', 'Họ và tên'];
    questions.forEach((q) => {
      headers.push(`C${q.question_order}`);
    });
    headers.push('Số câu đúng', 'Điểm (thang 10)');

    const headerRow = worksheet.addRow([]);
    worksheet.addRow(headers);
    const headerRowNum = 4;
    worksheet.getRow(headerRowNum).font = { bold: true };
    worksheet.getRow(headerRowNum).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // Rows for each student
    students.forEach((st) => {
      let correctCount = 0;
      const rowData: any[] = [st.card_id, st.full_name];

      questions.forEach((q) => {
        const studentAns = answerMap[st.id]?.[q.id];
        if (studentAns) {
          rowData.push(studentAns.selected_option + (studentAns.is_correct === 1 ? ' (✓)' : ' (✗)'));
          if (studentAns.is_correct === 1) correctCount++;
        } else {
          rowData.push('-');
        }
      });

      const totalQ = questions.length;
      const score = totalQ > 0 ? Number(((correctCount / totalQ) * 10).toFixed(1)) : 0;
      rowData.push(`${correctCount}/${totalQ}`);
      rowData.push(score);

      worksheet.addRow(rowData);
    });

    // Format column widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 25;
    for (let i = 3; i <= 2 + questions.length; i++) {
      worksheet.getColumn(i).width = 10;
    }
    worksheet.getColumn(3 + questions.length).width = 15;
    worksheet.getColumn(4 + questions.length).width = 15;

    const fileNameBase = `Ket_qua_${session.classroom_name}_${session.quiz_title}`.replace(/[\s/\\?%*:|"<>]/g, '_');

    if (format === 'csv') {
      res.attachment(`${fileNameBase}.csv`); // mã hóa tên file chuẩn (RFC 5987) để hỗ trợ tên có dấu
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      await workbook.csv.write(res);
      res.end();
    } else {
      res.attachment(`${fileNameBase}.xlsx`); // mã hóa tên file chuẩn (RFC 5987) để hỗ trợ tên có dấu
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
