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

    const { data: dbItems, error } = await supabaseAdmin
      .from('external_services')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, items: dbItems || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat layanan eksternal' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const body = await req.json();
    const {
      title,
      slug,
      subtitle = '',
      description = '',
      targetUrl,
      category = 'Pendidikan',
      icon = 'Sparkles',
      badge = '',
      tokenCost = 1,
      status = 'active',
      sortOrder = 0,
    } = body;

    if (!title?.trim() || !targetUrl?.trim()) {
      return NextResponse.json(
        { error: 'Nama layanan dan URL target wajib diisi.' },
        { status: 400 }
      );
    }

    // Auto generate slug if not provided
    const cleanSlug = (slug?.trim() || title.trim().toLowerCase())
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data, error } = await supabaseAdmin
      .from('external_services')
      .insert({
        title: title.trim(),
        slug: cleanSlug,
        subtitle: subtitle.trim(),
        description: description.trim(),
        target_url: targetUrl.trim(),
        category: category.trim(),
        icon: icon.trim(),
        badge: badge.trim(),
        token_cost: Number(tokenCost) >= 0 ? Number(tokenCost) : 1,
        status: ['active', 'maintenance', 'draft', 'archived'].includes(status) ? status : 'active',
        sort_order: Number(sortOrder) || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menambahkan layanan eksternal' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID layanan wajib disertakan' }, { status: 400 });
    }

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.targetUrl !== undefined) payload.target_url = updates.targetUrl.trim();
    if (updates.target_url !== undefined) payload.target_url = updates.target_url.trim();
    if (updates.category !== undefined) payload.category = updates.category.trim();
    if (updates.icon !== undefined) payload.icon = updates.icon.trim();
    if (updates.badge !== undefined) payload.badge = updates.badge.trim();
    if (updates.tokenCost !== undefined) payload.token_cost = Number(updates.tokenCost);
    if (updates.token_cost !== undefined) payload.token_cost = Number(updates.token_cost);
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.sortOrder !== undefined) payload.sort_order = Number(updates.sortOrder);
    if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order);

    const { data, error } = await supabaseAdmin
      .from('external_services')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui layanan' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID layanan wajib disertakan' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('external_services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Layanan eksternal berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus layanan' },
      { status: 500 }
    );
  }
}
