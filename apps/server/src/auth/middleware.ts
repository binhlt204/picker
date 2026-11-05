import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../database';
import { JWT_SECRET, TOKEN_TTL } from './config';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher';
  status: 'active' | 'pending' | 'disabled';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL as jwt.SignOptions['expiresIn'] });
}

export function findUserById(id: string): AuthUser | undefined {
  return getDB()
    .prepare('SELECT id, email, full_name, role, status FROM users WHERE id = ?')
    .get(id) as AuthUser | undefined;
}

/** Bắt buộc đăng nhập: đọc token Bearer, luôn kiểm tra lại tài khoản trong DB (đổi quyền/khóa có hiệu lực ngay). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập', code: 'UNAUTHENTICATED' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const user = payload.sub ? findUserById(String(payload.sub)) : undefined;
    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại', code: 'UNAUTHENTICATED' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Tài khoản chưa được kích hoạt hoặc đã bị khóa', code: 'INACTIVE' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', code: 'UNAUTHENTICATED' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền này', code: 'FORBIDDEN' });
  }
  next();
}
