import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const userId = params.userId;

    // 1. Update status di account_deletion_requests
    await supabaseAdmin
      .from('account_deletion_requests')
      .update({ status: 'completed' })
      .eq('user_id', userId);

    // 2. Hapus data pengguna dari tabel users
    const { error: userDelErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDelErr) {
      console.error('Error deleting user:', userDelErr);
      return NextResponse.json({ error: 'Gagal menghapus pengguna dari database' }, { status: 500 });
    }

    // 3. Hapus akun dari auth.users via Supabase Admin Auth jika didukung
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn('Supabase auth deleteUser warning (service role may not have permissions):', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Akun dan data pengguna berhasil dihapus permanen oleh Admin.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
