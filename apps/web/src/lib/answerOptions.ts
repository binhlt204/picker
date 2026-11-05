/**
 * Bộ màu A/B/C/D dùng chung cho toàn bộ ứng dụng — khớp với 4 mặt thẻ giấy in
 * (ArUco card): A = xanh dương, B = vàng cam, C = đỏ, D = xanh lá.
 *
 * Đây là NGOẠI LỆ DUY NHẤT trong quy tắc "không tự chọn màu trang trí":
 * 4 màu này mang chức năng nhận diện đáp án thật, không phải trang trí,
 * nên được giữ bão hòa và dùng y hệt ở mọi nơi hiển thị đáp án (màn chiếu,
 * xem trước câu hỏi khi soạn đề...). Trước đây bộ màu này đã đúng nhưng bị
 * khai báo trùng lặp ở `AnswerOptions.tsx` và `app/quizzes/page.tsx` — giờ
 * gom về một nguồn duy nhất tại đây.
 */
export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];

/** Mã hex thuần — dùng khi cần giá trị màu thật (canvas, PDF, tài liệu...), không phải className Tailwind. */
export const ANSWER_OPTION_HEX: Record<AnswerKey, string> = {
  A: '#2563EB', // blue-600
  B: '#D97706', // amber-600
  C: '#E11D48', // rose-600
  D: '#059669', // emerald-600
};

export const OPTION_CONFIG = {
  A: {
    badgeBg: 'bg-blue-600',
    borderDefault: 'border-blue-500/30',
    bgDefault: 'bg-blue-950/20 hover:bg-blue-900/30',
    textAccent: 'text-blue-400',
    barColor: 'bg-blue-500',
  },
  B: {
    badgeBg: 'bg-amber-600',
    borderDefault: 'border-amber-500/30',
    bgDefault: 'bg-amber-950/20 hover:bg-amber-900/30',
    textAccent: 'text-amber-400',
    barColor: 'bg-amber-500',
  },
  C: {
    badgeBg: 'bg-rose-600',
    borderDefault: 'border-rose-500/30',
    bgDefault: 'bg-rose-950/20 hover:bg-rose-900/30',
    textAccent: 'text-rose-400',
    barColor: 'bg-rose-500',
  },
  D: {
    badgeBg: 'bg-emerald-600',
    borderDefault: 'border-emerald-500/30',
    bgDefault: 'bg-emerald-950/20 hover:bg-emerald-900/30',
    textAccent: 'text-emerald-400',
    barColor: 'bg-emerald-500',
  },
} as const;
