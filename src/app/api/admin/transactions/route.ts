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
      query = query.or(`package_name.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        transactions: transactions || [],
        count: transactions?.length || 0,
        _timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat transaksi' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  }
}

// POST: Manual Settlement for delayed QRIS payment
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const adminEmail = auth.email || 'Super Admin';
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
