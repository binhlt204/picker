import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';
import {
  PASSWORD_MIN_LENGTH,
  REGISTER_REQUIRE_APPROVAL,
  RESET_TOKEN_TTL_MINUTES,
  WEB_URL,
} from '../auth/config';
import { requireAuth, signToken } from '../auth/middleware';
import { sendMail } from '../auth/mailer';
import { clientIp, hit, reset } from '../auth/rateLimit';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;
// Dùng để so sánh giả khi email không tồn tại, tránh lộ thông tin qua thời gian phản hồi
const DUMMY_HASH = bcrypt.hashSync('pickball-dummy-password', BCRYPT_ROUNDS);

function normalizeEmail(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  if (pw.length > 128) return 'Mật khẩu quá dài (tối đa 128 ký tự)';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Mật khẩu phải gồm cả chữ và số';
  return null;
}

function publicUser(u: any) {
  return { id: u.id, email: u.email, full_name: u.full_name, role: u.role, status: u.status };
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// POST /api/auth/register - Đăng ký tài khoản (tài khoản đầu tiên tự thành admin)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const wait = hit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (wait) return res.status(429).json({ error: `Thử lại sau ${wait} giây` });

    const email = normalizeEmail(req.body?.email);
    const fullName = String(req.body?.full_name ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ error: 'Email không hợp lệ' });
    if (fullName.length < 2 || fullName.length > 100) return res.status(400).json({ error: 'Họ tên phải từ 2 đến 100 ký tự' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const db = getDB();
    const id = uuidv4();

    const created = db.transaction(() => {
      const count = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as any).c as number;
      const isFirst = count === 0;
      const role = isFirst ? 'admin' : 'teacher';
      const status = isFirst || !REGISTER_REQUIRE_APPROVAL ? 'active' : 'pending';
      db.prepare(
        'INSERT INTO users (id, email, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, email, fullName, hash, role, status);
      return { id, email, full_name: fullName, role, status };
    })();

    if (created.status === 'active') {
      return res.status(201).json({
        token: signToken(created.id),
        user: publicUser(created),
        message: created.role === 'admin' ? 'Đã tạo tài khoản quản trị viên đầu tiên' : 'Đăng ký thành công',
      });
    }
    return res.status(202).json({
      pending: true,
      message: 'Đăng ký thành công. Tài khoản đang chờ quản trị viên duyệt, bạn sẽ đăng nhập được sau khi được duyệt.',
    });
  } catch (error: any) {
    if (String(error?.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'Email này đã được đăng ký' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login - Đăng nhập
router.post('/login', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });

    // Chống dò mật khẩu: giới hạn theo email và theo IP
    const wait = Math.max(hit(`login-ip:${clientIp(req)}`, 30, 15 * 60 * 1000), hit(`login-email:${email}`, 10, 15 * 60 * 1000));
    if (wait) return res.status(429).json({ error: `Đăng nhập sai quá nhiều lần, thử lại sau ${Math.ceil(wait / 60)} phút` });

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Tài khoản đang chờ quản trị viên duyệt', code: 'PENDING' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa', code: 'DISABLED' });
    }

    reset(`login-email:${email}`);
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/forgot-password - Yêu cầu đặt lại mật khẩu (luôn trả cùng 1 thông báo, không lộ email có tồn tại hay không)
router.post('/forgot-password', async (req: Request, res: Response) => {
  const genericMessage =
    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi. Link có hiệu lực ' +
    `${RESET_TOKEN_TTL_MINUTES} phút.`;
  try {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email không hợp lệ' });

    const wait = Math.max(hit(`forgot-ip:${clientIp(req)}`, 10, 15 * 60 * 1000), hit(`forgot-email:${email}`, 5, 60 * 60 * 1000));
    if (wait) return res.status(429).json({ error: `Thử lại sau ${Math.ceil(wait / 60)} phút` });

    const db = getDB();
    const user = db.prepare("SELECT id, email, full_name FROM users WHERE email = ? AND status != 'disabled'").get(email) as any;
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
      db.transaction(() => {
        db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(new Date().toISOString(), user.id);
        db.prepare('INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
          uuidv4(),
          user.id,
          sha256(token),
          expiresAt
        );
      })();

      const link = `${WEB_URL}/reset-password?token=${token}`;
      try {
        await sendMail(
          user.email,
          'Đặt lại mật khẩu Pickball',
          `Xin chào ${user.full_name},\n\nBạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu tài khoản Pickball.\n` +
            `Mở link sau để đặt mật khẩu mới (hiệu lực ${RESET_TOKEN_TTL_MINUTES} phút, dùng 1 lần):\n\n${link}\n\n` +
            'Nếu không phải bạn yêu cầu, hãy bỏ qua email này.'
        );
      } catch (mailErr: any) {
        console.error('Gửi email đặt lại mật khẩu thất bại:', mailErr?.message);
      }
    }
    res.json({ message: genericMessage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password - Đặt mật khẩu mới bằng token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const token = String(req.body?.token ?? '').trim();
    const password = String(req.body?.password ?? '');
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Link đặt lại mật khẩu không hợp lệ' });

    const wait = hit(`reset-ip:${clientIp(req)}`, 20, 15 * 60 * 1000);
    if (wait) return res.status(429).json({ error: `Thử lại sau ${Math.ceil(wait / 60)} phút` });

    const db = getDB();
    const row = db
      .prepare('SELECT id, user_id, expires_at FROM password_resets WHERE token_hash = ? AND used_at IS NULL')
      .get(sha256(token)) as any;
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy yêu cầu link mới.' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
      db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(new Date().toISOString(), row.user_id);
    })();

    res.json({ message: 'Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me - Thông tin tài khoản đang đăng nhập
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/change-password - Đổi mật khẩu khi đang đăng nhập
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const current = String(req.body?.current_password ?? '');
    const next = String(req.body?.new_password ?? '');
    const pwErr = validatePassword(next);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const wait = hit(`chpw:${req.user!.id}`, 10, 15 * 60 * 1000);
    if (wait) return res.status(429).json({ error: `Thử lại sau ${Math.ceil(wait / 60)} phút` });

    const db = getDB();
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!row || !(await bcrypt.compare(current, row.password_hash))) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(next, BCRYPT_ROUNDS), req.user!.id);
    res.json({ message: 'Đã đổi mật khẩu' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
