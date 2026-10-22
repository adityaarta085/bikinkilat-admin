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
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    let query = supabaseAdmin
      .from('transactions')
      .select('id, user_id, package_name, amount_idr, tokens_added, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`package_name.ilike.%${search}%,id.ilike.%${search}%,user_id.ilike.%${search}%`);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      count: transactions?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat transaksi' },
      { status: 500 }
    );
  }
}

// POST: Manual Settlement for delayed QRIS payment
export async function POST(req: NextRequest) {
  try {
    const adminEmailHeader = req.headers.get('x-admin-email');
    const authHeader = req.headers.get('authorization');

    let adminEmail = adminEmailHeader || '';

    if (!isSuperAdmin(adminEmail)) {
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (!user || !isSuperAdmin(user.email)) {
          return NextResponse.json({ error: 'Akses Ditolak' }, { status: 403 });
        }
        adminEmail = user.email || 'Admin';
      } else {
        return NextResponse.json({ error: 'Akses Ditolak' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId diperlukan' }, { status: 400 });
    }

    // 1. Fetch transaction
    const { data: tx, error: txErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    if (tx.status === 'completed') {
      return NextResponse.json({ error: 'Transaksi ini sudah selesai (completed).' }, { status: 400 });
    }

    const userId = tx.user_id;
    const tokensToAdd = tx.tokens_added || 10;

    // 2. Fetch user current balance
    const { data: user, error: uErr } = await supabaseAdmin
      .from('users')
      .select('tokens')
      .eq('id', userId)
      .single();

    if (uErr || !user) {
      return NextResponse.json({ error: 'Pengguna transaksi tidak ditemukan' }, { status: 404 });
    }

    const newBalance = (user.tokens || 0) + tokensToAdd;

    // 3. Update user balance
    await supabaseAdmin
      .from('users')
      .update({ tokens: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);

    // 4. Update transaction status
    await supabaseAdmin
      .from('transactions')
      .update({
        status: 'completed',
        package_name: `${tx.package_name} [Manual Settle: ${adminEmail}]`,
      })
      .eq('id', transactionId);

    return NextResponse.json({
      success: true,
      message: `Transaksi berhasil di-settle manual. Saldo pengguna bertambah +${tokensToAdd} token.`,
      newBalance,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal melakukan settle manual' },
      { status: 500 }
    );
  }
}
