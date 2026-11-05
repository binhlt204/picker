import React from 'react';
import { Card } from './Card';

type Tone = 'default' | 'brand' | 'success' | 'warning' | 'danger';

const TONE_CHIP: Record<Tone, string> = {
  default: 'bg-slate-800 text-slate-300',
  brand: 'bg-blue-500/10 text-blue-400',
  success: 'bg-emerald-500/10 text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-400',
  danger: 'bg-rose-500/10 text-rose-400',
};

export interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
}

/**
 * Ô thống kê dùng chung — trước đây có 3 cách code "stat tile" độc lập
 * (trang chủ, trang kết quả, ResultChart), mỗi nơi tô cả CON SỐ bằng màu
 * khác nhau (trắng/xanh/emerald/amber/rose/tím) không theo nghĩa nào.
 * Mặc định số liệu luôn trắng; `tone` chỉ tô nhẹ ô icon, và chỉ dùng tone
 * khác 'default' khi con số đó THỰC SỰ mang ý nghĩa (ví dụ "số câu đúng").
 */
export function StatTile({ label, value, icon, tone = 'default' }: StatTileProps) {
  return (
    <Card padding="md" className="flex flex-col gap-3">
      {icon && <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${TONE_CHIP[tone]}`}>{icon}</div>}
      <div>
        <div className="text-2xl font-black text-white font-mono">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      </div>
    </Card>
  );
}
