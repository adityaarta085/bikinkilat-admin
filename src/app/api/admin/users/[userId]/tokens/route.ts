import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const adminEmail = auth.email || 'Super Admin';
    const userId = params.userId;
    const body = await req.json();

    const { action, amount, reason } = body as {
      action: 'add' | 'deduct' | 'set';
      amount: number;
      reason?: string;
    };

    if (!action || typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: 'Parameter action (add/deduct/set) dan amount valid diperlukan' },
        { status: 400 }
      );
    }

    const auditReason = reason?.trim() || 'Penyesuaian oleh Super Admin';

    // 1. Fetch current user balance
    const { data: userData, error: userFetchErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, tokens')
      .eq('id', userId)
      .single();

    if (userFetchErr || !userData) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan di database' }, { status: 404 });
    }

    const previousBalance = userData.tokens || 0;
    let newBalance = previousBalance;
    let deltaTokens = 0;

    if (action === 'add') {
      newBalance = previousBalance + amount;
      deltaTokens = amount;
    } else if (action === 'deduct') {
      newBalance = Math.max(0, previousBalance - amount);
      deltaTokens = -(previousBalance - newBalance);
    } else if (action === 'set') {
      newBalance = Math.max(0, amount);
      deltaTokens = newBalance - previousBalance;
    }

    // 2. Update user token balance in database
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({
        tokens: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    // 3. Insert immutable audit trail log in transactions table
    const auditPackageName = `[Audit Admin: ${adminEmail}] ${auditReason} (${action.toUpperCase()} ${amount} Token, Saldo: ${previousBalance} -> ${newBalance})`;
    
    await supabaseAdmin
      .from('transactions')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        package_name: auditPackageName,
        amount_idr: 0,
        tokens_added: deltaTokens,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: `Saldo token pengguna berhasil diperbarui dari ${previousBalance} menjadi ${newBalance} token.`,
      data: {
        userId,
        userEmail: userData.email,
        previousBalance,
        newBalance,
        deltaTokens,
        action,
        reason: auditReason,
        adminEmail,
      },
    });
  } catch (err: any) {
    console.error('Error modifying tokens:', err);
    return NextResponse.json(
      { error: err?.message || 'Gagal mengubah saldo token pengguna' },
      { status: 500 }
    );
  }
}
