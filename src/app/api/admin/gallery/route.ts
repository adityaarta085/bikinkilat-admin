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
      .from('developer_gallery')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedDb = (dbItems || []).map((row) => ({
      id: row.id,
      title: row.title || 'Foto Galeri',
      description: row.description || '',
      category: row.category || 'Aktivitas',
      imageUrl: row.image_url || 'https://oonozobspxhvztoikakt.supabase.co/storage/v1/object/public/developer-assets/aditya-arta.jpg',
      date: row.date || new Date(row.created_at).getFullYear().toString(),
      isPinned: Boolean(row.is_pinned),
      createdAt: row.created_at,
    }));

    return NextResponse.json({ success: true, items: mappedDb });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat galeri pengembang' },
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
    const { title, description, category = 'Aktivitas', imageUrl, isPinned = false, date = '2026' } = body;

    if (!title?.trim() || !imageUrl?.trim()) {
      return NextResponse.json(
        { error: 'Judul dan tautan URL foto wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('developer_gallery')
      .insert({
        title: title.trim(),
        description: description?.trim() || '',
        category: category,
        image_url: imageUrl.trim(),
        date: date.toString(),
        is_pinned: Boolean(isPinned),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      item: {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        imageUrl: data.image_url,
        date: data.date,
        isPinned: data.is_pinned,
        createdAt: data.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan foto galeri' },
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
      return NextResponse.json({ error: 'ID foto wajib disertakan' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('developer_gallery')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Foto galeri berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus foto' },
      { status: 500 }
    );
  }
}
