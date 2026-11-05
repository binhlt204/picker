import nodemailer from 'nodemailer';

/**
 * Gửi email. Cấu hình SMTP bằng biến môi trường:
 *   SMTP_HOST, SMTP_PORT (mặc định 587), SMTP_USER, SMTP_PASS, SMTP_FROM
 * Nếu chưa cấu hình SMTP: KHÔNG gửi, chỉ in nội dung email ra console của server
 * (dùng để lấy link đặt lại mật khẩu khi chạy thử/cục bộ).
 */
export async function sendMail(to: string, subject: string, text: string): Promise<{ sent: boolean }> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`\n✉️  [EMAIL chưa cấu hình SMTP - chỉ in ra console]\n   Tới: ${to}\n   Tiêu đề: ${subject}\n${text}\n`);
    return { sent: false };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@pickball.local',
    to,
    subject,
    text,
  });
  return { sent: true };
}
