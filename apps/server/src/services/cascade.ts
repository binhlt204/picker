import { getDB } from '../database';

/**
 * Xóa dữ liệu chính kèm toàn bộ dữ liệu phụ thuộc (trong 1 transaction) để không bị chặn bởi khóa ngoại.
 * Mỗi hàm trả về số bản ghi chính đã xóa (0 = không tìm thấy).
 */

export function deleteQuestion(id: string): number {
  const db = getDB();
  return db.transaction(() => {
    db.prepare('DELETE FROM session_answers WHERE question_id = ?').run(id);
    return db.prepare('DELETE FROM questions WHERE id = ?').run(id).changes;
  })();
}

export function deleteStudent(id: string): number {
  const db = getDB();
  return db.transaction(() => {
    db.prepare('DELETE FROM session_answers WHERE student_id = ?').run(id);
    return db.prepare('DELETE FROM students WHERE id = ?').run(id).changes;
  })();
}

/** Xóa lớp: xóa luôn phiên thi của lớp (bài làm xóa theo CASCADE) và bài làm của học sinh trong lớp. */
export function deleteClassroom(id: string): number {
  const db = getDB();
  return db.transaction(() => {
    db.prepare('DELETE FROM session_answers WHERE student_id IN (SELECT id FROM students WHERE classroom_id = ?)').run(id);
    db.prepare('DELETE FROM exam_sessions WHERE classroom_id = ?').run(id);
    return db.prepare('DELETE FROM classrooms WHERE id = ?').run(id).changes;
  })();
}

/** Xóa bộ đề: xóa luôn phiên thi dùng đề này và bài làm của các câu hỏi trong đề. */
export function deleteQuiz(id: string): number {
  const db = getDB();
  return db.transaction(() => {
    db.prepare('DELETE FROM session_answers WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)').run(id);
    db.prepare('DELETE FROM exam_sessions WHERE quiz_id = ?').run(id);
    return db.prepare('DELETE FROM quizzes WHERE id = ?').run(id).changes;
  })();
}

/** Xóa phiên thi (bài làm xóa theo ON DELETE CASCADE). */
export function deleteSession(id: string): number {
  return getDB().prepare('DELETE FROM exam_sessions WHERE id = ?').run(id).changes;
}

export function deleteAnswer(id: string): number {
  return getDB().prepare('DELETE FROM session_answers WHERE id = ?').run(id).changes;
}
