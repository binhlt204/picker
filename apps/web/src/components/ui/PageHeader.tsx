import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Cụm nút thao tác bên phải; tự xuống dòng ở màn hẹp, không bao giờ tràn ngang. */
  actions?: React.ReactNode;
}

/**
 * Đầu trang dùng chung cho các trang quản lý: tiêu đề cỡ vừa (không phóng to quá mức),
 * mô tả mờ, cụm nút xếp gọn và tự wrap. Tên/tiêu đề dài sẽ xuống dòng thay vì tràn.
 */
export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          {icon && <span className="shrink-0 text-blue-500">{icon}</span>}
          <span className="min-w-0 break-words">{title}</span>
        </h1>
        {description && <p className="text-sm text-slate-400 mt-1 break-words">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
