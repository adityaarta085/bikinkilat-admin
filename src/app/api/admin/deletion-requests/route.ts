import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { data, error } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    const list = data || [];
    const pendingCount = list.filter((r) => r.status === 'pending').length;

    return NextResponse.json(
      {
        success: true,
        requests: list,
        count: list.length,
        pendingCount,
        _timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat antrean permintaan hapus akun' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const body = await req.json();
    const { action, requestId, userId } = body;

    if (!requestId && !userId) {
      return NextResponse.json({ error: 'Request ID atau User ID diperlukan' }, { status: 400 });
    }

    // 1. EKSEKUSI HAPUS PERMANEN OLEH ADMIN
    if (action === 'purge') {
      let targetUserId = userId;

      // Ambil user_id jika hanya requestId yang diberikan
      if (!targetUserId && requestId) {
        const { data: reqRecord } = await supabaseAdmin
          .from('account_deletion_requests')
          .select('user_id')
          .eq('id', requestId)
          .maybeSingle();
        targetUserId = reqRecord?.user_id;
      }

      // Tandai request selesai
      if (requestId) {
        await supabaseAdmin
          .from('account_deletion_requests')
          .update({ status: 'completed' })
          .eq('id', requestId);
      } else if (targetUserId) {
        await supabaseAdmin
          .from('account_deletion_requests')
          .update({ status: 'completed' })
          .eq('user_id', targetUserId);
      }

      // Hapus dari tabel public.users
      if (targetUserId) {
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', targetUserId);

        // Hapus dari auth.users jika diizinkan
        try {
          await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        } catch (e) {
          console.warn('Supabase auth.admin.deleteUser notice:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Akun dan seluruh sesi pengguna berhasil dihapus permanen oleh Admin.',
      });
    }

    // 2. BATALKAN PERMINTAAN HAPUS (KEMBALIKAN KE NORMAL)
    if (action === 'cancel') {
      let targetUserId = userId;

      if (requestId) {
        const { data: reqRecord } = await supabaseAdmin
          .from('account_deletion_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId)
          .select('user_id')
          .maybeSingle();
        if (reqRecord?.user_id) targetUserId = reqRecord.user_id;
      } else if (targetUserId) {
        await supabaseAdmin
          .from('account_deletion_requests')
          .update({ status: 'cancelled' })
          .eq('user_id', targetUserId);
      }

      if (targetUserId) {
        await supabaseAdmin
          .from('users')
          .update({
            deletion_status: null,
            deletion_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      }

      return NextResponse.json({
        success: true,
        message: 'Permintaan penghapusan akun dibatalkan. Status akun dikembalikan ke normal.',
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
