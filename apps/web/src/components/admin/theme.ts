import { defaultDarkTheme } from 'react-admin';
import type { RaThemeOptions } from 'react-admin';

/**
 * Theme riêng cho trang quản trị (react-admin/MUI), dựng trên nền defaultDarkTheme có sẵn
 * nhưng đổi bảng màu khớp với hệ thống thiết kế dùng chung của web (xem lib/answerOptions.ts
 * và components/ui/*): cùng 1 màu thương hiệu xanh dương, cùng thang nền tối slate, để /admin
 * không còn là một "ứng dụng lạ" ghép vào sản phẩm.
 */
export const pickballAdminTheme: RaThemeOptions = {
  ...defaultDarkTheme,
  palette: {
    ...defaultDarkTheme.palette,
    mode: 'dark',
    primary: { main: '#2563EB' }, // xanh dương thương hiệu, khớp web + mobile
    error: { main: '#F43F5E' },
    warning: { main: '#F59E0B' },
    success: { main: '#10B981' },
    background: { default: '#020617', paper: '#0f172a' }, // slate-950 / slate-900
  },
  shape: { ...defaultDarkTheme.shape, borderRadius: 12 },
};
