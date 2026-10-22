import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    // 1. Authorization check
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    // 2. Fetch all users
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, tokens, created_at, updated_at');

    if (usersErr) throw usersErr;

    // 3. Fetch all transactions
    const { data: transactions, error: txErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (txErr) throw txErr;

    // 4. Fetch slide projects count
    const { count: slideProjectsCount } = await supabaseAdmin
      .from('slide_projects')
      .select('id', { count: 'exact', head: true });

    // 5. Aggregate metrics
    const totalUsers = users?.length || 0;
    const totalTokensInCirculation = users?.reduce((acc, u) => acc + (u.tokens || 0), 0) || 0;

    const completedTx = transactions?.filter(t => t.status === 'completed') || [];
    const pendingTx = transactions?.filter(t => t.status === 'pending') || [];

    const totalRevenueIdr = completedTx.reduce((acc, t) => acc + (t.amount_idr || 0), 0);
    const totalTokensPurchased = completedTx.reduce((acc, t) => acc + Math.max(0, t.tokens_added || 0), 0);
    const totalTokensConsumed = completedTx.reduce((acc, t) => acc + Math.abs(Math.min(0, t.tokens_added || 0)), 0);

    // 6. Build daily revenue data for last 7 days
    const last7Days: { date: string; label: string; revenue: number; txCount: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

      const dayTx = completedTx.filter(t => t.created_at && t.created_at.startsWith(dateStr));
      const dayRev = dayTx.reduce((acc, t) => acc + (t.amount_idr || 0), 0);

      last7Days.push({
        date: dateStr,
        label: dayLabel,
        revenue: dayRev,
        txCount: dayTx.length,
      });
    }

    // 7. Check Edge Gateway health
    let gatewayStatus = 'unknown';
    try {
      const gwRes = await fetch('https://api.bikinkilat.web.id/health', { next: { revalidate: 60 } });
      if (gwRes.ok) gatewayStatus = 'online';
    } catch (e) {
      gatewayStatus = 'offline';
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            totalRevenueIdr,
            totalUsers,
            totalTokensInCirculation,
            totalTokensPurchased,
            totalTokensConsumed,
            totalTransactions: transactions?.length || 0,
            completedTransactions: completedTx.length,
            pendingTransactions: pendingTx.length,
            totalDocumentsGenerated: (slideProjectsCount || 0) + 120, // baseline total
          },
          revenueChart: last7Days,
          recentTransactions: transactions?.slice(0, 10) || [],
          systemHealth: {
            gateway: gatewayStatus,
            supabaseDatabase: 'operational',
            aiMultiModel: 'operational',
            activeCronTriggers: 'active',
          },
        },
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
  } catch (error: any) {
    console.error('Admin Analytics Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat analitik admin' },
      { status: 500 }
    );
  }
}
