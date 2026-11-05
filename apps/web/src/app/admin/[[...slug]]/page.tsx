'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

// react-admin dùng router riêng và chỉ chạy ở trình duyệt nên tắt SSR
const AdminApp = dynamic(() => import('@/components/admin/AdminApp'), {
  ssr: false,
  loading: () => <div className="flex-1 p-8 text-center text-slate-400">Đang tải trang quản trị...</div>,
});

export default function AdminPage() {
  const { user } = useAuth();

  // Chưa đăng nhập: AuthGate sẽ chuyển về /login. Đã đăng nhập nhưng không phải admin thì chặn tại đây.
  if (user && user.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-bold text-white">Bạn không có quyền truy cập trang quản trị</h1>
        <p className="text-sm text-slate-400">Chỉ tài khoản quản trị viên mới vào được khu vực này.</p>
        <Link href="/" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return <AdminApp />;
}
