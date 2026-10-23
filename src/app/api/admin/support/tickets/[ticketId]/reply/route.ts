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
    const {
      message,
      status = 'in_progress',
      notify_user = true,
      is_popup = false,
      send_email = false,
    } = body;

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
    // Identitas pengirim selalu "Customer Support BikinKilat", email pribadi admin tidak terekspos ke publik
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
          created_by: 'Customer Support BikinKilat',
        });

      if (!notifErr) {
        notificationSent = true;
      } else {
        console.warn('Failed to insert notification for support reply:', notifErr);
      }
    }

    // 5. Send outbound email to user_email if requested and email exists
    let emailResult = { sent: false, note: '' };
    if (send_email && ticket.user_email) {
      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://api.bikinkilat.web.id';
        const resendKey = process.env.RESEND_API_KEY;
        const brevoKey = process.env.BREVO_API_KEY;

        const emailSubject = `Re: [${ticket.ticket_number}] ${ticket.subject}`;
        const emailBody = `Halo ${ticket.user_name || 'Pelanggan BikinKilat'},\n\n${message.trim()}\n\n---\nTim Customer Support BikinKilat\nWebsite: https://bikinkilat.web.id\nNomor Tiket: ${ticket.ticket_number}\nEmail Resmi: support@bikinkilat.web.id`;

        if (resendKey) {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Customer Support BikinKilat <support@bikinkilat.web.id>',
              reply_to: 'support@bikinkilat.web.id',
              to: [ticket.user_email],
              subject: emailSubject,
              text: emailBody,
            }),
          });
          if (resendRes.ok) {
            emailResult = { sent: true, note: 'Email balasan terkirim via Resend.' };
          }
        } else if (brevoKey) {
          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: { name: 'Customer Support BikinKilat', email: 'support@bikinkilat.web.id' },
              replyTo: { name: 'Customer Support BikinKilat', email: 'support@bikinkilat.web.id' },
              to: [{ email: ticket.user_email, name: ticket.user_name }],
              subject: emailSubject,
              textContent: emailBody,
            }),
          });
          if (brevoRes.ok) {
            emailResult = { sent: true, note: 'Email balasan terkirim via Brevo.' };
          }
        } else {
          // Attempt edge gateway dispatcher
          const edgeRes = await fetch(`${gatewayUrl}/api/support/reply-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: ticket.user_email,
              name: ticket.user_name,
              subject: emailSubject,
              message: message.trim(),
              ticket_number: ticket.ticket_number,
            }),
          });
          if (edgeRes.ok) {
            const edgeData = await edgeRes.json();
            emailResult = { sent: !!edgeData.success, note: edgeData.provider ? `Terkirim via Edge (${edgeData.provider})` : 'Terkirim via Edge.' };
          } else {
            emailResult = { sent: false, note: 'API key pengirim email belum aktif, pesan tersimpan aman di tiket panel admin.' };
          }
        }
      } catch (e: any) {
        emailResult = { sent: false, note: `Pengiriman email dilewati: ${e?.message || e}` };
      }
    }

    return NextResponse.json({
      success: true,
      message: newMsg,
      ticket: updatedTicket,
      notification_sent: notificationSent,
      email_sent: emailResult.sent,
      email_note: emailResult.note,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal mengirim balasan tiket.' },
      { status: 500 }
    );
  }
}
