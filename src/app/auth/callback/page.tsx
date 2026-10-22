'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/admin-auth';

export default function AdminAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          router.push('/auth?error=auth_failed');
          return;
        }

        const email = session.user?.email;
        if (isSuperAdmin(email)) {
          router.push('/');
        } else {
          router.push('/auth?error=unauthorized');
        }
      } catch (e) {
        router.push('/auth?error=unexpected');
      }
    }

    handleCallback();
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
