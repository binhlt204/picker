import { Request, Response, NextFunction } from 'express';
import { getDB } from '../database';
import type { AuthUser } from '../auth/middleware';

/**
 * Phân quyền theo chủ sở hữu: mỗi lớp / bộ đề / phiên thi thuộc về 1 tài khoản (cột owner_id).
 * - Giáo viên chỉ thấy và thao tác trên dữ liệu của chính mình.
 * - Quản trị viên (admin) thấy và quản lý toàn bộ.
 * Học sinh thuộc lớp, câu hỏi thuộc bộ đề, bài làm thuộc phiên thi nên kế thừa quyền của cha.
 * Dữ liệu cũ chưa có chủ (owner_id rỗng) chỉ admin thấy, cho tới khi được gán chủ.
 */

type OwnedTable = 'classrooms' | 'quizzes' | 'exam_sessions';

export const isAdmin = (user?: AuthUser) => user?.role === 'admin';

/** Mệnh đề SQL lọc theo chủ sở hữu (admin: không lọc). */
export function ownerClause(user: AuthUser | undefined, alias: string): { sql: string; params: string[] } {
  if (!user || isAdmin(user)) return { sql: '', params: [] };
  return { sql: `${alias}.owner_id = ?`, params: [user.id] };
}

function canAccessRow(user: AuthUser | undefined, table: OwnedTable, id: string): boolean {
  if (!user) return false;
  const row = getDB().prepare(`SELECT owner_id FROM ${table} WHERE id = ?`).get(id) as { owner_id: string | null } | undefined;
  if (!row) return false;
  return isAdmin(user) || row.owner_id === user.id;
}

export const canAccessClassroom = (u: AuthUser | undefined, id: string) => canAccessRow(u, 'classrooms', id);
export const canAccessQuiz = (u: AuthUser | undefined, id: string) => canAccessRow(u, 'quizzes', id);
export const canAccessSession = (u: AuthUser | undefined, id: string) => canAccessRow(u, 'exam_sessions', id);

export function canAccessStudent(u: AuthUser | undefined, studentId: string): boolean {
  const row = getDB().prepare('SELECT classroom_id FROM students WHERE id = ?').get(studentId) as { classroom_id: string } | undefined;
  return !!row && canAccessClassroom(u, row.classroom_id);
}

export function canAccessQuestion(u: AuthUser | undefined, questionId: string): boolean {
  const row = getDB().prepare('SELECT quiz_id FROM questions WHERE id = ?').get(questionId) as { quiz_id: string } | undefined;
  return !!row && canAccessQuiz(u, row.quiz_id);
}

/**
 * Tạo middleware cho router.param(): chạy cho MỌI route có tham số đó, trả 404 nếu không có quyền
 * (dùng 404 thay vì 403 để không lộ việc tài nguyên của người khác có tồn tại).
 */
export function paramGuard(check: (user: AuthUser | undefined, id: string) => boolean, notFoundMessage: string) {
  return (req: Request, res: Response, next: NextFunction, value: string) => {
    if (!check(req.user, String(value))) {
      return res.status(404).json({ error: notFoundMessage });
    }
    next();
  };
}

export const classroomParam = paramGuard(canAccessClassroom, 'Không tìm thấy lớp học');
export const quizParam = paramGuard(canAccessQuiz, 'Không tìm thấy bộ đề');
export const sessionParam = paramGuard(canAccessSession, 'Không tìm thấy phiên thi');
export const studentParam = paramGuard(canAccessStudent, 'Không tìm thấy học sinh');
export const questionParam = paramGuard(canAccessQuestion, 'Không tìm thấy câu hỏi');
