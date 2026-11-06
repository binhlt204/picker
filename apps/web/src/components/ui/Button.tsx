import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white disabled:hover:bg-blue-600',
  secondary: 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 disabled:hover:bg-slate-900',
  danger: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white disabled:hover:bg-rose-600',
  ghost: 'text-slate-300 hover:text-slate-100 hover:bg-slate-800 disabled:hover:bg-transparent',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-2 text-[13px]',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Nút dùng chung toàn app — thay cho các nút CTA tự viết tay với màu/gradient
 * riêng ở từng trang (xem Kế hoạch thiết kế lại giao diện). `primary` luôn là
 * MÀU THƯƠNG HIỆU DUY NHẤT (xanh dương), không gradient, không glow:
 * mỗi trang không còn được tự chọn "màu chủ đề" riêng cho nút chính nữa.
 */
export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
