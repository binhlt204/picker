import React from 'react';
import { FiX } from 'react-icons/fi';

const MAX_WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH;
  children: React.ReactNode;
}

/**
 * Khung modal dùng chung — trước đây classrooms/quizzes/sessions tự viết tay
 * `fixed inset-0 ... bg-slate-950/80` ở 7+ chỗ, còn TimerSettingsPanel lại
 * dùng một khung hơi khác (`bg-black/70`, viền slate-700). Giờ gộp về 1 kiểu.
 */
export function Modal({ open, onClose, title, maxWidth = 'lg', children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${MAX_WIDTH[maxWidth]} max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Đóng">
              <FiX />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
