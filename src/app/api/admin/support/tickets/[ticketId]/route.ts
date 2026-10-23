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

// PATCH: Update ticket status, priority, category, or metadata
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
    const { status, priority, category, subject, user_name, user_email } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;
    if (subject) updateData.subject = subject.trim();
    if (user_name) updateData.user_name = user_name.trim();
    if (user_email) updateData.user_email = user_email.trim();

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

// DELETE: Permanently delete a ticket and all its conversation history
export async function DELETE(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { ticketId } = params;

    // 1. Delete all child messages first (satisfy foreign key constraints)
    const { error: msgErr } = await supabaseAdmin
      .from('support_ticket_messages')
      .delete()
      .eq('ticket_id', ticketId);

    if (msgErr) {
      console.warn('Notice deleting messages:', msgErr.message);
    }

    // 2. Delete the ticket itself permanently
    const { error: ticketErr } = await supabaseAdmin
      .from('support_tickets')
      .delete()
      .eq('id', ticketId);

    if (ticketErr) throw ticketErr;

    return NextResponse.json({
      success: true,
      message: 'Tiket dan seluruh riwayat pesan berhasil dihapus permanen.',
    });
  } catch (err: any) {
    console.error('Error deleting ticket:', err);
    return NextResponse.json(
      { error: err?.message || 'Gagal menghapus tiket bantuan.' },
      { status: 500 }
    );
  }
}
