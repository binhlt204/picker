import React from 'react';

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-4 sm:p-6',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof PADDING;
}

/**
 * Nền panel dùng chung duy nhất của app — trước đây mỗi trang tự viết
 * `bg-slate-900/NN` với 5 giá trị độ mờ khác nhau (60/40/80/70/50) và
 * 3 kiểu bo góc (xl/2xl/3xl). Giờ cố định 1 kiểu: nền đặc, bo 2xl.
 */
export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div className={`min-w-0 rounded-xl bg-slate-900 border border-slate-800 ${PADDING[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}
