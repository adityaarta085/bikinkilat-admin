import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';

// POST: Admin reply to support ticket & dispatch notification to user
export async function POST(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const adminEmail = auth.email || 'Super Admin BikinKilat';
    const { ticketId } = params;
    const body = await req.json();
    const { message, status = 'in_progress', notify_user = true, is_popup = false } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Pesan balasan wajib diisi.' }, { status: 400 });
    }

    // 1. Fetch ticket to verify and get user_id & ticket_number
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });
    }

    // 2. Insert admin reply message
    const { data: newMsg, error: msgErr } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        id: crypto.randomUUID(),
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_name: 'Customer Support BikinKilat',
        message: message.trim(),
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // 3. Update ticket status & updated_at
    const { data: updatedTicket, error: updateErr } = await supabaseAdmin
      .from('support_tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Dispatch notification to user if notify_user is true and user_id is linked
    let notificationSent = false;
    if (notify_user && ticket.user_id) {
      const notifTitle = `Tiket Bantuan #${ticket.ticket_number} Dibalas Admin`;
      const notifMessage = `Pesan CS BikinKilat: "${message.trim().slice(0, 150)}${message.length > 150 ? '...' : ''}"`;

      const { error: notifErr } = await supabaseAdmin
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          user_id: ticket.user_id,
          title: notifTitle,
          message: notifMessage,
          type: 'info',
          is_popup: !!is_popup,
          action_url: `/#bantuan?ticket=${ticket.ticket_number}`,
          created_by: adminEmail,
        });

      if (!notifErr) {
        notificationSent = true;
      } else {
        console.warn('Failed to insert notification for support reply:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: newMsg,
      ticket: updatedTicket,
      notification_sent: notificationSent,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal mengirim balasan tiket.' },
      { status: 500 }
    );
  }
}
