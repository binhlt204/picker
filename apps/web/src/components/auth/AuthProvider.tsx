'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, getToken, PUBLIC_PATHS, setToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher';
  status: 'active' | 'pending' | 'disabled';
}

interface RegisterInput {
  email: string;
  full_name: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Trả về pending=true nếu tài khoản cần admin duyệt trước khi đăng nhập */
  register: (input: RegisterInput) => Promise<{ pending: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục phiên đăng nhập từ token đã lưu
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (!cancelled) setUser(res.data.user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.post('/auth/register', input);
    if (res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      return { pending: false, message: res.data.message as string };
    }
    return { pending: true, message: res.data.message as string };
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Chặn các trang cần đăng nhập: chưa đăng nhập thì chuyển về /login (nhớ trang đang xem để quay lại),
 * đã đăng nhập mà vào /login, /register thì chuyển về trang chủ.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    } else if (user && (pathname === '/login' || pathname === '/register')) {
      router.replace('/');
    }
  }, [loading, user, isPublic, pathname, router]);

  // Trang công khai luôn hiển thị ngay (không chờ kiểm tra đăng nhập) để HTML dựng sẵn từ server
  // khớp với lần render đầu ở trình duyệt, tránh lỗi hydration. Người đã đăng nhập vào /login sẽ được chuyển về trang chủ ở effect trên.
  if (isPublic) return <>{children}</>;

  // Trang cần đăng nhập: chờ khôi phục phiên, hoặc đang chuyển về /login khi chưa đăng nhập
  if (loading || !user) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        Đang tải...
      </div>
    );
  }
  return <>{children}</>;
}
