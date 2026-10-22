import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';

// GET: Get ticket details and conversation messages
export async function GET(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { ticketId } = params;

    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;

    // Also get user token balance if user_id exists
    let userTokens = null;
    if (ticket.user_id) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('tokens')
        .eq('id', ticket.user_id)
        .maybeSingle();

      if (userData) {
        userTokens = userData.tokens;
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        user_tokens: userTokens,
        messages: messages || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal memuat detail tiket.' },
      { status: 500 }
    );
  }
}

// PATCH: Update ticket status or priority
export async function PATCH(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { ticketId } = params;
    const body = await req.json();
    const { status, priority } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const { data: updatedTicket, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal memperbarui tiket.' },
      { status: 500 }
    );
  }
}
