'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/admin-auth';

export default function AdminAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let resolved = false;

    const handleValidSession = (sessionUserEmail?: string | null) => {
      if (resolved) return;
      resolved = true;
      if (isSuperAdmin(sessionUserEmail)) {
        router.push('/');
      } else {
        router.push('/auth?error=unauthorized');
      }
    };

    // 1. Direct session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (session?.user?.email) {
        handleValidSession(session.user.email);
      }
    }).catch(() => {});

    // 2. Listen to SIGNED_IN event from OAuth hash parser
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        handleValidSession(session.user.email);
      }
    });

    // 3. Safety timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        router.push('/auth?error=auth_timeout');
      }
    }, 6000);

    return () => {
      clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-white space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
        <ShieldCheck className="w-8 h-8" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold">Memverifikasi Izin Super Admin...</h2>
        <p className="text-xs text-slate-400">Menghubungkan sesi terenkripsi ke Command Center</p>
      </div>
      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mt-2" />
    </div>
  );
}
