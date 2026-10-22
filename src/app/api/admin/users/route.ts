import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const adminEmailHeader = req.headers.get('x-admin-email');
    const authHeader = req.headers.get('authorization');

    if (!isSuperAdmin(adminEmailHeader)) {
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (!user || !isSuperAdmin(user.email)) {
          return NextResponse.json({ error: 'Akses Ditolak: Khusus Super Admin' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Akses Ditolak: Otorisasi diperlukan' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, tokens, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: users || [],
      count: users?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil daftar pengguna' },
      { status: 500 }
    );
  }
}
