import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';

// GET: List all tickets for admin
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search?.trim()) {
      query = query.or(
        `ticket_number.ilike.%${search.trim()}%,user_name.ilike.%${search.trim()}%,user_email.ilike.%${search.trim()}%,subject.ilike.%${search.trim()}%`
      );
    }

    const { data: tickets, error: ticketErr } = await query;
    if (ticketErr) throw ticketErr;

    // Fetch stats
    const { data: allTickets } = await supabaseAdmin
      .from('support_tickets')
      .select('status');

    const stats = {
      total: allTickets?.length || 0,
      open: allTickets?.filter((t) => t.status === 'open').length || 0,
      in_progress: allTickets?.filter((t) => t.status === 'in_progress').length || 0,
      resolved: allTickets?.filter((t) => t.status === 'resolved' || t.status === 'closed').length || 0,
    };

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal memuat tiket bantuan.' },
      { status: 500 }
    );
  }
}
