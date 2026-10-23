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

    const { data: dbEntries, error } = await supabaseAdmin
      .from('developer_guestbook')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (dbEntries || []).map((row) => ({
      id: row.id,
      name: row.name || 'Pengunjung',
      role: row.role || 'Sahabat BikinKilat',
      message: row.message || '',
      avatar: row.avatar || '🚀',
      isPinned: Boolean(row.is_pinned),
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      entries: mapped,
      total: mapped.length,
      pinnedCount: mapped.filter((e) => e.isPinned).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat pesan buku tamu' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const body = await req.json();
    const { id, isPinned } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pesan wajib disertakan.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('developer_guestbook')
      .update({ is_pinned: Boolean(isPinned), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui status pesan' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID pesan wajib disertakan.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('developer_guestbook')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Komentar buku tamu berhasil dihapus secara permanen.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus pesan buku tamu' },
      { status: 500 }
    );
  }
}
