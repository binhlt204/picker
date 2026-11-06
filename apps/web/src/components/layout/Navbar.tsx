'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiUsers, FiFileText, FiPlayCircle, FiLogOut, FiSettings, FiMenu, FiX, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '@/components/auth/AuthProvider';
import { PUBLIC_PATHS } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';

const NAV_LINKS = [
  { href: '/', label: 'Tổng quan', icon: FiGrid },
  { href: '/classrooms', label: 'Lớp học', icon: FiUsers },
  { href: '/quizzes', label: 'Đề thi', icon: FiFileText },
  { href: '/sessions', label: 'Phiên thi', icon: FiPlayCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Đóng mọi menu khi chuyển trang
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng menu
  useEffect(() => {
    if (!mobileOpen && !userMenuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        setMobileOpen(false);
        setUserMenuOpen(false);
      } else if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen, userMenuOpen]);

  // Màn chiếu toàn màn hình: ẩn hẳn navbar
  if (pathname.includes('/projector/')) return null;
  // Trang đăng nhập/đăng ký/quên mật khẩu và trang quản trị (có thanh điều hướng riêng) không hiện navbar này
  if (PUBLIC_PATHS.includes(pathname) || pathname === '/admin' || pathname.startsWith('/admin/')) return null;
  // Chưa đăng nhập (đang chuyển hướng về /login) thì không hiện menu
  if (!user) return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const initial = (user.full_name || user.email || '?').trim().charAt(0).toUpperCase();
  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên';

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Thương hiệu + link (màn rộng) */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="LB HOUSE - Trang chủ">
              <Logo size="sm" />
              <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">LB HOUSE</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      active ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={active ? 'text-blue-400' : ''} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Tài khoản (màn rộng) */}
          <div className="hidden lg:block relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-slate-900 transition"
            >
              <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center">
                {initial}
              </span>
              <span className="text-sm font-medium text-slate-200 max-w-[160px] truncate">{user.full_name}</span>
              <FiChevronDown className={`text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-1.5"
              >
                <div className="px-3 py-2.5 border-b border-slate-800 mb-1">
                  <div className="text-sm font-semibold text-slate-100 truncate">{user.full_name}</div>
                  <div className="text-xs text-slate-400 truncate">{user.email}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{roleLabel}</div>
                </div>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  >
                    <FiSettings className="text-slate-500" /> Trang quản trị
                  </Link>
                )}
                <button
                  role="menuitem"
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 text-left"
                >
                  <FiLogOut className="text-slate-500" /> Đăng xuất
                </button>
              </div>
            )}
          </div>

          {/* Nút menu (màn hẹp) */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 -mr-2 rounded-lg text-slate-300 hover:bg-slate-900 hover:text-slate-100"
          >
            {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Menu dọc (màn hẹp) */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={active ? 'text-blue-400' : ''} />
                  <span>{label}</span>
                </Link>
              );
            })}
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              >
                <FiSettings /> <span>Trang quản trị</span>
              </Link>
            )}
            <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 shrink-0 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center">
                  {initial}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">{user.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">{roleLabel}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 border border-slate-800 hover:bg-slate-900 whitespace-nowrap"
              >
                <FiLogOut /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
