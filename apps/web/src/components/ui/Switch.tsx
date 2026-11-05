import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

/**
 * Công tắc bật/tắt dùng chung — tách từ bản tự viết tay trong
 * TimerSettingsPanel (trước đây dùng bg-emerald-500 khi bật, nhưng "bật"
 * không mang nghĩa "đúng/thành công" nên đổi về màu thương hiệu duy nhất).
 */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-14 h-8 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-600'}`}
    >
      <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : ''}`} />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}
