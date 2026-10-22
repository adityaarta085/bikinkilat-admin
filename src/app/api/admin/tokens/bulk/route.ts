import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const adminEmail = auth.email || 'Super Admin';
    const body = await req.json();

    const { action, userId, amount = 0, reason = '', triggerPopup = false, popupTitle = '', popupMessage = '' } = body;

    // Action 1: Broadcast Add Tokens to ALL registered users
    if (action === 'broadcast_add') {
      const grantAmount = Math.max(1, parseInt(amount, 10) || 0);
      const auditReason = reason?.trim() || 'Bonus Loyalitas Massal oleh Super Admin';

      const { data: users, error: fetchErr } = await supabaseAdmin
        .from('users')
        .select('id, tokens');

      if (fetchErr) throw fetchErr;
      if (!users || users.length === 0) {
        return NextResponse.json({ error: 'Tidak ada pengguna ditemukan di sistem' }, { status: 404 });
      }

      const nowIso = new Date().toISOString();
      const auditRows = [];

      for (const u of users) {
        const nextTokens = (u.tokens || 0) + grantAmount;
        await supabaseAdmin
          .from('users')
          .update({ tokens: nextTokens, updated_at: nowIso })
          .eq('id', u.id);

        auditRows.push({
          id: crypto.randomUUID(),
          user_id: u.id,
          package_name: `[Broadcast Token: ${adminEmail}] ${auditReason} (+${grantAmount} Token)`,
          amount_idr: 0,
          tokens_added: grantAmount,
          status: 'completed',
          created_at: nowIso,
        });
      }

      if (auditRows.length > 0) {
        await supabaseAdmin.from('transactions').insert(auditRows);
      }

      // Auto create notification
      await supabaseAdmin.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: null, // Broadcast to all
        title: popupTitle?.trim() || `🎉 Anda Mendapatkan +${grantAmount} Token Gratis!`,
        message: popupMessage?.trim() || `Super Admin telah menambahkan ${grantAmount} token bonus ke akun Anda: "${auditReason}". Selamat berkarya!`,
        type: 'success',
        is_popup: Boolean(triggerPopup),
        tokens_granted: grantAmount,
        created_at: nowIso,
        created_by: adminEmail,
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil membagikan +${grantAmount} token ke seluruh ${users.length} pengguna terdaftar dengan audit tercatat.`,
        affectedUsers: users.length,
      });
    }

    // Action 2: Burn / Reset User Tokens to 0
    if (action === 'burn_reset') {
      if (!userId) {
        return NextResponse.json({ error: 'userId diperlukan untuk tindakan burn/reset' }, { status: 400 });
      }

      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .select('id, email, name, tokens')
        .eq('id', userId)
        .single();

      if (userErr || !user) {
        return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
      }

      const previousBalance = user.tokens || 0;
      const penaltyReason = reason?.trim() || 'Penalti Pelanggaran Ketentuan / Rollback Token Tidak Sah';
      const nowIso = new Date().toISOString();

      // Set user tokens to 0
      await supabaseAdmin
        .from('users')
        .update({ tokens: 0, updated_at: nowIso })
        .eq('id', userId);

      // Insert penalty audit transaction
      await supabaseAdmin.from('transactions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        package_name: `[Penalti Burn Token: ${adminEmail}] ${penaltyReason} (-${previousBalance} Token, Saldo Direset ke 0)`,
        amount_idr: 0,
        tokens_added: -previousBalance,
        status: 'completed',
        created_at: nowIso,
      });

      // Always create a Warning Popup notification for this user
      await supabaseAdmin.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title: popupTitle?.trim() || '⚠️ Peringatan Penting: Saldo Token Direset',
        message: popupMessage?.trim() || `Saldo token Anda (${previousBalance} token) telah direset menjadi 0 oleh Super Admin karena alasan: "${penaltyReason}". Harap patuhi ketentuan penggunaan BikinKilat.`,
        type: 'urgent',
        is_popup: true, // Always show popup modal when user enters next time!
        tokens_granted: 0,
        created_at: nowIso,
        created_by: adminEmail,
      });

      return NextResponse.json({
        success: true,
        message: `Saldo pengguna ${user.email} (${previousBalance} token) berhasil dihanguskan (0 token) dan modal peringatan telah dipasang.`,
        previousBalance,
        newBalance: 0,
      });
    }

    // Action 3: Deduct tokens with warning modal
    if (action === 'deduct_with_warning') {
      if (!userId) {
        return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
      }

      const deductAmount = Math.max(1, parseInt(amount, 10) || 0);
      const auditReason = reason?.trim() || 'Penyesuaian / Pemotongan Saldo oleh Super Admin';

      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .select('id, email, tokens')
        .eq('id', userId)
        .single();

      if (userErr || !user) {
        return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
      }

      const prevBal = user.tokens || 0;
      const newBal = Math.max(0, prevBal - deductAmount);
      const actualDeducted = prevBal - newBal;
      const nowIso = new Date().toISOString();

      await supabaseAdmin
        .from('users')
        .update({ tokens: newBal, updated_at: nowIso })
        .eq('id', userId);

      await supabaseAdmin.from('transactions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        package_name: `[Pemotongan Token: ${adminEmail}] ${auditReason} (-${actualDeducted} Token)`,
        amount_idr: 0,
        tokens_added: -actualDeducted,
        status: 'completed',
        created_at: nowIso,
      });

      // Create warning popup if requested
      if (triggerPopup) {
        await supabaseAdmin.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          title: popupTitle?.trim() || '⚠️ Pemberitahuan Pemotongan Token',
          message: popupMessage?.trim() || `Saldo token Anda dipotong ${actualDeducted} token oleh Super Admin (Alasan: "${auditReason}"). Saldo saat ini: ${newBal} token.`,
          type: 'warning',
          is_popup: true,
          tokens_granted: 0,
          created_at: nowIso,
          created_by: adminEmail,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil memotong ${actualDeducted} token dari pengguna ${user.email}. Saldo baru: ${newBal} token.`,
        previousBalance: prevBal,
        newBalance: newBal,
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memproses aksi token' },
      { status: 500 }
    );
  }
}
