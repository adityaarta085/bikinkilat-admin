'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertTriangle, ArrowRight, LogOut } from 'lucide-react';
import { useAdminAuth, PRIMARY_ADMIN_EMAIL } from '@/lib/admin-auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading, signInWithGoogle, signOut } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full inline-block">
              Super Admin Gate
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              BikinKilat Command Center
            </h1>
            <p className="text-xs text-slate-400">
              Panel kendali eksekutif &amp; analitik multi-subdomain
            </p>
          </div>
        </div>

        {/* State 1: User is logged in but NOT an authorized admin */}
        {!isLoading && user && !isAdmin ? (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs uppercase">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Akses Ditolak (403 Forbidden)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Anda masuk dengan akun: <strong className="text-white block mt-1">{user.email}</strong>
              Akun ini tidak terdaftar sebagai Super Admin BikinKilat.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={signOut}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Keluar &amp; Gunakan Akun Admin</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Default Login Form */
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Otentikasi Akun Resmi</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Silakan masuk dengan akun Google pemilik sistem: <br />
                <code className="text-emerald-400 font-mono text-[11px] mt-1 inline-block">
                  {PRIMARY_ADMIN_EMAIL}
                </code>
              </p>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-3 disabled:opacity-50 min-h-[50px]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk via Akun Google Admin</span>
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/80 text-center">
          <a
            href="https://bikinkilat.web.id"
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            ← Kembali ke Portal Publik (bikinkilat.web.id)
          </a>
        </div>
      </div>
    </div>
  );
}
