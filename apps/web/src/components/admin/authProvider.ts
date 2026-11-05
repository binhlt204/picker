import type { AuthProvider } from 'react-admin';
import { api, getToken, setToken } from '@/lib/api';

/**
 * AuthProvider của react-admin dùng chung phiên đăng nhập (token) với phần còn lại của web.
 * Việc đăng nhập diễn ra ở trang /login của web nên ở đây không có màn hình đăng nhập riêng.
 */
export const authProvider: AuthProvider = {
  login: async () => {
    window.location.assign('/login?next=/admin');
  },

  logout: async () => {
    setToken(null);
    window.location.assign('/login');
    return false; // đã tự chuyển trang, không cần react-admin chuyển hướng nữa
  },

  checkAuth: async () => {
    if (!getToken()) throw new Error('Chưa đăng nhập');
  },

  // 401 (hết phiên) -> đăng xuất; 403 (không đủ quyền) -> giữ nguyên để hiện thông báo lỗi
  checkError: async (error: any) => {
    if (error?.status === 401) throw error;
  },

  getIdentity: async () => {
    const res = await api.get('/auth/me');
    const u = res.data.user;
    return { id: u.id, fullName: `${u.full_name} (${u.email})` };
  },

  getPermissions: async () => {
    const res = await api.get('/auth/me');
    return res.data.user.role as string;
  },
};
