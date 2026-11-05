'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiUsers, FiFileText, FiPlayCircle, FiLayers, FiLogOut, FiSettings } from 'react-icons/fi';
import { useAuth } from '@/components/auth/AuthProvider';
import { PUBLIC_PATHS } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // If inside projector mode, hide navbar completely for clean full-screen display
  if (pathname.includes('/projector/')) {
    return null;
  }

  // Trang đăng nhập/đăng ký/quên mật khẩu và trang quản trị (có thanh điều hướng riêng) không hiện navbar này
  if (PUBLIC_PATHS.includes(pathname) || pathname === '/admin' || pathname.startsWith('/admin/')) {
    return null;
  }

  // Chưa đăng nhập (đang chuyển hướng về /login) thì không hiện menu
  if (!user) {
    return null;
  }

  const navLinks = [
    { href: '/', label: 'Tổng quan', icon: FiGrid },
    { href: '/classrooms', label: 'Lớp học & Thẻ', icon: FiUsers },
    { href: '/quizzes', label: 'Ngân hàng đề thi', icon: FiFileText },
    { href: '/sessions', label: 'Phiên kiểm tra', icon: FiPlayCircle },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition">
                <FiLayers className="text-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  PICKBALL <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold">Realtime</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1">Trắc nghiệm thẻ ArUco trực tiếp</span>
              </div>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="text-base" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition"
                title="Trang quản trị tài khoản và dữ liệu"
              >
                <FiSettings className="text-sm text-blue-400" />
                <span className="hidden sm:inline">Quản trị</span>
              </Link>
            )}
            <Link
              href="/sessions"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 transition active:scale-95"
            >
              <FiPlayCircle className="text-base" />
              <span>Vào phòng thi</span>
            </Link>
            <div className="hidden lg:block text-right leading-tight">
              <div className="text-xs font-semibold text-white max-w-[140px] truncate">{user.full_name}</div>
              <div className="text-[10px] text-slate-400">{user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold transition"
              title="Đăng xuất"
            >
              <FiLogOut className="text-sm" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
