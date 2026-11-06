'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert, AuthCard, Field, SubmitButton } from '@/components/auth/AuthCard';
import { getErrorMessage } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    setLoading(true);
    try {
      const result = await register({ email: email.trim(), full_name: fullName.trim(), password });
      if (result.pending) {
        setPendingMessage(result.message);
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  }

  if (pendingMessage) {
    return (
      <AuthCard title="Đăng ký thành công">
        <div className="space-y-5">
          <Alert type="success">{pendingMessage}</Alert>
          <Link
            href="/login"
            className="block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-sm py-2.5 transition"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Tạo tài khoản"
      subtitle="Tài khoản đầu tiên của hệ thống sẽ là quản trị viên. Các tài khoản sau cần được quản trị viên duyệt."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Field
          id="full_name"
          label="Họ và tên"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nguyễn Văn A"
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ten@truong.edu.vn"
        />
        <Field
          id="password"
          label="Mật khẩu (tối thiểu 8 ký tự, có chữ và số)"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          id="confirm"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <SubmitButton loading={loading}>Đăng ký</SubmitButton>
      </form>
    </AuthCard>
  );
}
