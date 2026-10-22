import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';

// GET: List all notifications with stats
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    // Fetch all notifications
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch read statistics
    const { data: readStats, error: statsErr } = await supabaseAdmin
      .from('user_notifications_read')
      .select('notification_id');

    if (statsErr) console.warn('Warning fetching read stats:', statsErr);

    // Count reads per notification
    const readCounts: Record<string, number> = {};
    if (readStats) {
      for (const r of readStats) {
        readCounts[r.notification_id] = (readCounts[r.notification_id] || 0) + 1;
      }
    }

    // Attach user emails if target is specific user
    const userIds = notifications
      ?.map((n) => n.user_id)
      .filter((id): id is string => Boolean(id)) || [];

    let usersMap: Record<string, { email: string; name: string }> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .in('id', userIds);

      if (usersData) {
        for (const u of usersData) {
          usersMap[u.id] = { email: u.email, name: u.name };
        }
      }
    }

    const enhanced = (notifications || []).map((n) => ({
      ...n,
      read_count: readCounts[n.id] || 0,
      target_user: n.user_id ? usersMap[n.user_id] || null : null,
    }));

    return NextResponse.json({
      success: true,
      notifications: enhanced,
      count: enhanced.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil notifikasi' },
      { status: 500 }
    );
  }
}

// POST: Create and dispatch a new notification
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const adminEmail = auth.email || 'Super Admin';
    const body = await req.json();

    const {
      title,
      message,
      type = 'info',
      target_type = 'all',
      user_id = null,
      is_popup = false,
      action_url = null,
      tokens_granted = 0,
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Judul dan pesan notifikasi wajib diisi.' },
        { status: 400 }
      );
    }

    if (target_type === 'user' && !user_id) {
      return NextResponse.json(
        { error: 'ID Pengguna wajib dipilih jika target spesifik.' },
        { status: 400 }
      );
    }

    const targetUserId = target_type === 'user' ? user_id : null;
    const tokenAmount = Math.max(0, parseInt(tokens_granted, 10) || 0);

    // 1. Insert notification record
    const { data: newNotification, error: notifErr } = await supabaseAdmin
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        user_id: targetUserId,
        title: title.trim(),
        message: message.trim(),
        type,
        is_popup: Boolean(is_popup),
        action_url: action_url?.trim() || null,
        tokens_granted: tokenAmount,
        created_at: new Date().toISOString(),
        created_by: adminEmail,
      })
      .select()
      .single();

    if (notifErr) throw notifErr;

    // 2. Handle token granting if requested
    let tokenResultMessage = '';
    if (tokenAmount > 0) {
      if (targetUserId) {
        // Grant tokens to single user
        const { data: userRec } = await supabaseAdmin
          .from('users')
          .select('id, email, tokens')
          .eq('id', targetUserId)
          .single();

        if (userRec) {
          const newBal = (userRec.tokens || 0) + tokenAmount;
          await supabaseAdmin
            .from('users')
            .update({ tokens: newBal, updated_at: new Date().toISOString() })
            .eq('id', targetUserId);

          await supabaseAdmin.from('transactions').insert({
            id: crypto.randomUUID(),
            user_id: targetUserId,
            package_name: `[Notifikasi Hadiah Token Admin] ${title.trim()} (+${tokenAmount} Token)`,
            amount_idr: 0,
            tokens_added: tokenAmount,
            status: 'completed',
            created_at: new Date().toISOString(),
          });

          tokenResultMessage = ` & ${tokenAmount} token berhasil ditambahkan ke dompet penerima (Saldo baru: ${newBal}).`;
        }
      } else {
        // Broadcast token to ALL users
        const { data: allUsers } = await supabaseAdmin
          .from('users')
          .select('id, tokens');

        if (allUsers && allUsers.length > 0) {
          const nowIso = new Date().toISOString();
          const auditRows = [];

          for (const u of allUsers) {
            const updatedTokens = (u.tokens || 0) + tokenAmount;
            await supabaseAdmin
              .from('users')
              .update({ tokens: updatedTokens, updated_at: nowIso })
              .eq('id', u.id);

            auditRows.push({
              id: crypto.randomUUID(),
              user_id: u.id,
              package_name: `[Broadcast Hadiah Token Admin] ${title.trim()} (+${tokenAmount} Token)`,
              amount_idr: 0,
              tokens_added: tokenAmount,
              status: 'completed',
              created_at: nowIso,
            });
          }

          // Insert audit logs in chunks
          if (auditRows.length > 0) {
            await supabaseAdmin.from('transactions').insert(auditRows);
          }

          tokenResultMessage = ` & ${tokenAmount} token berhasil dibagikan ke seluruh ${allUsers.length} pengguna terdaftar.`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notifikasi berhasil dikirim${tokenResultMessage}`,
      notification: newNotification,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengirim notifikasi' },
      { status: 500 }
    );
  }
}

// DELETE: Remove notification by ID
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID notifikasi diperlukan' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil dihapus.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus notifikasi' },
      { status: 500 }
    );
  }
}
