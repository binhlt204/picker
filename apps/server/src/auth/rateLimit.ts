import { Request } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** IP của người gọi (ưu tiên header của Cloudflare Tunnel nếu có). */
export function clientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  return (Array.isArray(cf) ? cf[0] : cf) || req.ip || 'unknown';
}

/**
 * Giới hạn số lần thử (chống dò mật khẩu). Trả về số giây phải chờ nếu đã vượt giới hạn, ngược lại trả 0.
 */
export function hit(key: string, max: number, windowMs: number): number {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  b.count += 1;
  if (b.count > max) return Math.ceil((b.resetAt - now) / 1000);
  return 0;
}

export function reset(key: string) {
  buckets.delete(key);
}

// Dọn các bucket đã hết hạn để không tốn bộ nhớ
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 10 * 60 * 1000).unref();
