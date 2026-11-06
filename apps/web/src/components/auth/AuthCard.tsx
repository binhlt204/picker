import React from 'react';
import Link from 'next/link';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 bg-slate-950 min-h-screen">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-6">
          <Logo />
          <span className="text-xl font-bold tracking-tight text-slate-100">LB HOUSE</span>
        </Link>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-7">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-sm text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full min-w-0 rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
      />
    </div>
  );
}

export function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isError = type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm border break-words ${
        isError
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}
    >
      {isError ? <FiAlertCircle className="mt-0.5 shrink-0" /> : <FiCheckCircle className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={loading} className="w-full">
      {loading ? 'Đang xử lý...' : children}
    </Button>
  );
}
