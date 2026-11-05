import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Thư mục chứa DB (cùng nơi lưu khóa bí mật JWT)
const DATA_DIR = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(__dirname, '../../data');

function loadJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  // Không đặt JWT_SECRET: tự sinh 1 khóa ngẫu nhiên và lưu lại để token vẫn hợp lệ sau khi khởi động lại server
  const file = path.join(DATA_DIR, '.jwt-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch {}
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export const JWT_SECRET = loadJwtSecret();
export const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d';
export const RESET_TOKEN_TTL_MINUTES = 30;

// true (mặc định): tài khoản đăng ký sau tài khoản đầu tiên phải được admin duyệt mới đăng nhập được
export const REGISTER_REQUIRE_APPROVAL = process.env.REGISTER_REQUIRE_APPROVAL !== 'false';

// Địa chỉ web dùng để tạo link đặt lại mật khẩu gửi qua email
export const WEB_URL = (process.env.WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const PASSWORD_MIN_LENGTH = 8;
