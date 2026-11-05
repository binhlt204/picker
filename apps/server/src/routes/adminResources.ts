import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';
import { PASSWORD_MIN_LENGTH } from '../auth/config';
import {
  deleteAnswer,
  deleteClassroom,
  deleteQuestion,
  deleteQuiz,
  deleteSession,
  deleteStudent,
} from '../services/cascade';

/**
 * API CRUD tổng quát cho Dashboard quản trị (react-admin), CHỈ dành cho admin.
 * Chỉ các bảng/cột trong danh sách trắng dưới đây mới truy cập được; mọi giá trị đều dùng tham số ràng buộc.
 * Danh sách trả về dạng { data: [...], total }.
 */

interface ResourceConfig {
  table: string;
  columns: string[]; // cột được trả về (không bao giờ gồm password_hash)
  writable: string[]; // cột được tạo/sửa
  required: string[]; // cột bắt buộc khi tạo
  searchable: string[]; // cột tìm kiếm văn bản (tham số q)
  defaultSort: string;
  enums?: Record<string, string[]>;
  intColumns?: string[];
  readOnly?: boolean; // chỉ cho xem + xóa
  remove: (id: string) => number;
}

const RESOURCES: Record<string, ResourceConfig> = {
  users: {
    table: 'users',
    columns: ['id', 'email', 'full_name', 'role', 'status', 'created_at', 'last_login_at'],
    writable: ['email', 'full_name', 'role', 'status'],
    required: ['email', 'full_name'],
    searchable: ['email', 'full_name'],
    defaultSort: 'created_at',
    enums: { role: ['admin', 'teacher'], status: ['active', 'pending', 'disabled'] },
    remove: (id) => getDB().prepare('DELETE FROM users WHERE id = ?').run(id).changes,
  },
  classrooms: {
    table: 'classrooms',
    columns: ['id', 'name', 'created_at'],
    writable: ['name'],
    required: ['name'],
    searchable: ['name'],
    defaultSort: 'created_at',
    remove: deleteClassroom,
  },
  students: {
    table: 'students',
    columns: ['id', 'classroom_id', 'card_id', 'full_name'],
    writable: ['classroom_id', 'card_id', 'full_name'],
    required: ['classroom_id', 'card_id', 'full_name'],
    searchable: ['full_name'],
    defaultSort: 'card_id',
    intColumns: ['card_id'],
    remove: deleteStudent,
  },
  quizzes: {
    table: 'quizzes',
    columns: ['id', 'title', 'created_at'],
    writable: ['title'],
    required: ['title'],
    searchable: ['title'],
    defaultSort: 'created_at',
    remove: deleteQuiz,
  },
  questions: {
    table: 'questions',
    columns: ['id', 'quiz_id', 'question_order', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'time_limit'],
    writable: ['quiz_id', 'question_order', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'time_limit'],
    required: ['quiz_id', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'],
    searchable: ['content'],
    defaultSort: 'question_order',
    enums: { correct_option: ['A', 'B', 'C', 'D'] },
    intColumns: ['question_order', 'time_limit'],
    remove: deleteQuestion,
  },
  sessions: {
    table: 'exam_sessions',
    columns: ['id', 'classroom_id', 'quiz_id', 'status', 'current_question_order', 'created_at'],
    writable: ['classroom_id', 'quiz_id', 'status', 'current_question_order'],
    required: ['classroom_id', 'quiz_id'],
    searchable: [],
    defaultSort: 'created_at',
    enums: { status: ['WAITING', 'ACTIVE', 'COMPLETED'] },
    intColumns: ['current_question_order'],
    remove: deleteSession,
  },
  answers: {
    table: 'session_answers',
    columns: ['id', 'session_id', 'question_id', 'student_id', 'selected_option', 'is_correct', 'submitted_at'],
    writable: [],
    required: [],
    searchable: [],
    defaultSort: 'submitted_at',
    readOnly: true,
    remove: deleteAnswer,
  },
};

const router = Router();

function getConfig(req: Request, res: Response): ResourceConfig | null {
  const cfg = RESOURCES[String(req.params.resource)];
  if (!cfg) {
    res.status(404).json({ error: 'Tài nguyên không tồn tại' });
    return null;
  }
  return cfg;
}

/** Chuyển lỗi SQLite thành thông báo dễ hiểu. */
function sendDbError(res: Response, error: any) {
  const code = String(error?.code || '');
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return res.status(409).json({ error: 'Giá trị bị trùng (đã tồn tại bản ghi khác có cùng giá trị duy nhất, ví dụ email hoặc số thẻ trong lớp)' });
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({ error: 'Tham chiếu không hợp lệ (lớp/đề/phiên không tồn tại hoặc còn dữ liệu liên quan)' });
  }
  if (code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }
  return res.status(500).json({ error: error?.message || 'Lỗi máy chủ' });
}

/** Làm sạch và kiểm tra giá trị người dùng gửi lên theo cấu hình; trả về lỗi (chuỗi) hoặc null. */
function sanitize(cfg: ResourceConfig, body: any, requireAll: boolean): { values: Record<string, any>; error?: string } {
  const values: Record<string, any> = {};
  for (const col of cfg.writable) {
    if (!(col in (body || {}))) continue;
    let v = body[col];
    if (cfg.intColumns?.includes(col)) {
      // Ô số để trống (react-admin gửi null): bỏ qua nếu không bắt buộc (khi tạo sẽ dùng giá trị mặc định)
      if ((v === '' || v === null) && !cfg.required.includes(col)) continue;
      const n = Number(v);
      if (v === '' || v === null || !Number.isInteger(n)) return { values, error: `"${col}" phải là số nguyên` };
      v = n;
    } else if (typeof v === 'string') {
      v = v.trim();
    }
    if (cfg.enums?.[col] && !cfg.enums[col].includes(v)) {
      return { values, error: `"${col}" phải là một trong: ${cfg.enums[col].join(', ')}` };
    }
    values[col] = v;
  }
  if (requireAll) {
    for (const col of cfg.required) {
      if (values[col] === undefined || values[col] === '' || values[col] === null) {
        return { values, error: `Thiếu trường bắt buộc: ${col}` };
      }
    }
  }
  for (const [col, v] of Object.entries(values)) {
    if (typeof v === 'string' && v === '' && cfg.required.includes(col)) return { values, error: `"${col}" không được để trống` };
  }
  if (values.card_id !== undefined && (values.card_id < 1 || values.card_id > 50)) {
    return { values, error: 'Số thẻ phải từ 1 đến 50' };
  }
  if (values.time_limit !== undefined && (values.time_limit < 5 || values.time_limit > 180)) {
    return { values, error: 'Thời gian trả lời phải từ 5 đến 180 giây' };
  }
  return { values };
}

function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Mật khẩu phải gồm cả chữ và số';
  return null;
}

/** Không cho admin tự khóa/hạ quyền/xóa mình, và không để hệ thống không còn admin hoạt động. */
function guardAdminChange(req: Request, targetId: string, next: { role?: string; status?: string } | 'delete'): string | null {
  const db = getDB();
  const target = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(targetId) as any;
  if (!target) return null;
  const isSelf = req.user?.id === targetId;
  const losesAdmin =
    target.role === 'admin' &&
    target.status === 'active' &&
    (next === 'delete' || (next.role !== undefined && next.role !== 'admin') || (next.status !== undefined && next.status !== 'active'));
  if (!losesAdmin) return null;
  if (isSelf) return 'Bạn không thể tự xóa, khóa hoặc hạ quyền chính mình';
  const others = (db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND status = 'active' AND id != ?").get(targetId) as any).c;
  if (others === 0) return 'Phải còn ít nhất một quản trị viên đang hoạt động';
  return null;
}

// GET /api/admin/resources/:resource?_start&_end&_sort&_order&q&filter={"col":value|[values]}
router.get('/:resource', (req: Request, res: Response) => {
  try {
    const cfg = getConfig(req, res);
    if (!cfg) return;

    const where: string[] = [];
    const params: any[] = [];

    let filter: Record<string, any> = {};
    try {
      filter = req.query.filter ? JSON.parse(String(req.query.filter)) : {};
    } catch {
      return res.status(400).json({ error: 'Tham số filter không hợp lệ' });
    }
    for (const [col, val] of Object.entries(filter)) {
      if (!cfg.columns.includes(col)) continue;
      if (Array.isArray(val)) {
        if (val.length === 0) {
          where.push('1 = 0');
        } else {
          where.push(`${col} IN (${val.map(() => '?').join(',')})`);
          params.push(...val);
        }
      } else if (val !== null && val !== undefined && val !== '') {
        where.push(`${col} = ?`);
        params.push(val);
      }
    }

    const q = String(req.query.q || '').trim();
    if (q && cfg.searchable.length > 0) {
      where.push(`(${cfg.searchable.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
      const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
      cfg.searchable.forEach(() => params.push(like));
    }

    const sort = cfg.columns.includes(String(req.query._sort)) ? String(req.query._sort) : cfg.defaultSort;
    const order = String(req.query._order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const start = Math.max(0, parseInt(String(req.query._start ?? '0'), 10) || 0);
    const end = parseInt(String(req.query._end ?? ''), 10);
    const limit = Number.isFinite(end) ? Math.min(Math.max(end - start, 1), 1000) : 100;

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const db = getDB();
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM ${cfg.table} ${whereSql}`).get(...params) as any).c as number;
    const data = db
      .prepare(`SELECT ${cfg.columns.join(', ')} FROM ${cfg.table} ${whereSql} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`)
      .all(...params, limit, start);

    res.json({ data, total });
  } catch (error: any) {
    sendDbError(res, error);
  }
});

// GET /api/admin/resources/:resource/:id
router.get('/:resource/:id', (req: Request, res: Response) => {
  try {
    const cfg = getConfig(req, res);
    if (!cfg) return;
    const row = getDB().prepare(`SELECT ${cfg.columns.join(', ')} FROM ${cfg.table} WHERE id = ?`).get(String(req.params.id));
    if (!row) return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    res.json({ data: row });
  } catch (error: any) {
    sendDbError(res, error);
  }
});

// POST /api/admin/resources/:resource
router.post('/:resource', async (req: Request, res: Response) => {
  try {
    const cfg = getConfig(req, res);
    if (!cfg) return;
    if (cfg.readOnly) return res.status(405).json({ error: 'Tài nguyên này chỉ cho xem' });

    const { values, error } = sanitize(cfg, req.body, true);
    if (error) return res.status(400).json({ error });
    const db = getDB();

    if (cfg.table === 'users') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return res.status(400).json({ error: 'Email không hợp lệ' });
      values.email = values.email.toLowerCase();
      const pw = String(req.body?.password ?? '');
      const pwErr = validatePassword(pw);
      if (pwErr) return res.status(400).json({ error: pwErr });
      values.password_hash = await bcrypt.hash(pw, 10);
      values.role = values.role || 'teacher';
      values.status = values.status || 'active';
    }
    if (cfg.table === 'questions') {
      values.time_limit = values.time_limit ?? 30;
      if (values.question_order === undefined) {
        const max = (db.prepare('SELECT MAX(question_order) AS m FROM questions WHERE quiz_id = ?').get(values.quiz_id) as any).m;
        values.question_order = (max || 0) + 1;
      }
    }
    if (cfg.table === 'exam_sessions') {
      values.status = values.status || 'WAITING';
      values.current_question_order = values.current_question_order ?? 0;
    }

    const id = uuidv4();
    const cols = ['id', ...Object.keys(values)];
    db.prepare(`INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(id, ...Object.values(values));
    const row = db.prepare(`SELECT ${cfg.columns.join(', ')} FROM ${cfg.table} WHERE id = ?`).get(id);
    res.status(201).json({ data: row });
  } catch (error: any) {
    sendDbError(res, error);
  }
});

// PUT /api/admin/resources/:resource/:id
router.put('/:resource/:id', async (req: Request, res: Response) => {
  try {
    const cfg = getConfig(req, res);
    if (!cfg) return;
    if (cfg.readOnly) return res.status(405).json({ error: 'Tài nguyên này chỉ cho xem' });

    const id = String(req.params.id);
    const db = getDB();
    const exists = db.prepare(`SELECT id FROM ${cfg.table} WHERE id = ?`).get(id);
    if (!exists) return res.status(404).json({ error: 'Không tìm thấy bản ghi' });

    const { values, error } = sanitize(cfg, req.body, false);
    if (error) return res.status(400).json({ error });

    if (cfg.table === 'users') {
      if (values.email !== undefined) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return res.status(400).json({ error: 'Email không hợp lệ' });
        values.email = values.email.toLowerCase();
      }
      const guard = guardAdminChange(req, id, { role: values.role, status: values.status });
      if (guard) return res.status(400).json({ error: guard });
      // Đặt mật khẩu mới cho người dùng (dùng khi họ quên mật khẩu và không có email)
      const pw = req.body?.password;
      if (typeof pw === 'string' && pw !== '') {
        const pwErr = validatePassword(pw);
        if (pwErr) return res.status(400).json({ error: pwErr });
        values.password_hash = await bcrypt.hash(pw, 10);
      }
    }

    const keys = Object.keys(values);
    if (keys.length > 0) {
      db.prepare(`UPDATE ${cfg.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...Object.values(values), id);
    }
    const row = db.prepare(`SELECT ${cfg.columns.join(', ')} FROM ${cfg.table} WHERE id = ?`).get(id);
    res.json({ data: row });
  } catch (error: any) {
    sendDbError(res, error);
  }
});

// DELETE /api/admin/resources/:resource/:id
router.delete('/:resource/:id', (req: Request, res: Response) => {
  try {
    const cfg = getConfig(req, res);
    if (!cfg) return;
    const id = String(req.params.id);

    if (cfg.table === 'users') {
      const guard = guardAdminChange(req, id, 'delete');
      if (guard) return res.status(400).json({ error: guard });
    }

    const row = getDB().prepare(`SELECT ${cfg.columns.join(', ')} FROM ${cfg.table} WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    cfg.remove(id);
    res.json({ data: row });
  } catch (error: any) {
    sendDbError(res, error);
  }
});

export default router;
