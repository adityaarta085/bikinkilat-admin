import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/server-admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const INITIAL_GALLERY = [
  {
    id: 'gal-1',
    title: 'Aditya Arta Putra - Founder & Solo Developer',
    description: 'Aditya Arta Putra, siswa 11 TJKT A SMK Muhammadiyah Bandongan saat memimpin arsitektur dan pengembangan ekosistem BikinKilat.web.id.',
    category: 'Aktivitas',
    imageUrl: '/developer/aditya-arta.jpg',
    date: '2026',
    isPinned: true,
  },
  {
    id: 'gal-2',
    title: 'Aktivitas Akademik SMK Muhammadiyah Bandongan',
    description: 'Dokumentasi pembelajaran kejuruan Teknik Jaringan Komputer & Telekomunikasi (TJKT) di lingkungan SMK Muhammadiyah Bandongan.',
    category: 'Sekolah',
    imageUrl: '/developer/about-sec-image.jpeg',
    date: '2026',
    isPinned: true,
  },
  {
    id: 'gal-3',
    title: 'Portal Resmi Desa Ngawonggo (ngawonggo.web.id)',
    description: 'Kepemimpinan arsitektur sistem informasi publik kemitraan Pemdes Ngawonggo & SMK Muhammadiyah Bandongan.',
    category: 'Proyek',
    imageUrl: '/developer/aditya-arta.jpg',
    date: '2026',
  },
  {
    id: 'gal-4',
    title: 'Kredensial & Penghargaan Arsitektur Sistem',
    description: 'Piagam kredensial resmi terverifikasi dan apresiasi inovasi teknologi web publik.',
    category: 'Sertifikat',
    imageUrl: '/developer/about-sec-image.jpeg',
    date: '2025',
  },
  {
    id: 'gal-5',
    title: 'Pengembangan 9 Subdomain BikinKilat',
    description: 'Perancangan antarmuka cerdas dan integrasi pembayaran QRIS instan sub-2 detik.',
    category: 'Proyek',
    imageUrl: '/developer/aditya-arta.jpg',
    date: '2026',
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Akses Ditolak' }, { status: auth.status });
    }

    const { data: dbItems, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('type', 'developer_gallery')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedDb = (dbItems || []).map((row) => ({
      id: row.id,
      title: row.title || 'Foto Galeri',
      description: row.message || '',
      category: row.created_by || 'Aktivitas',
      imageUrl: row.action_url || '/developer/aditya-arta.jpg',
      date: new Date(row.created_at).getFullYear().toString(),
      isPinned: Boolean(row.is_popup),
      createdAt: row.created_at,
    }));

    const existingIds = new Set(mappedDb.map((i) => i.id));
    const merged = [
      ...mappedDb,
      ...INITIAL_GALLERY.filter((i) => !existingIds.has(i.id)),
    ];

    return NextResponse.json({ success: true, items: merged });
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
    const { title, description, category = 'Aktivitas', imageUrl, isPinned = false } = body;

    if (!title?.trim() || !imageUrl?.trim()) {
      return NextResponse.json(
        { error: 'Judul dan tautan URL foto wajib diisi.' },
        { status: 400 }
      );
    }

    const newId = crypto.randomUUID();
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        id: newId,
        title: title.trim(),
        message: description?.trim() || '',
        action_url: imageUrl.trim(),
        created_by: category,
        type: 'developer_gallery',
        is_popup: Boolean(isPinned),
        tokens_granted: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      item: {
        id: data.id,
        title: data.title,
        description: data.message,
        category: data.created_by,
        imageUrl: data.action_url,
        isPinned: data.is_popup,
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
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('type', 'developer_gallery');

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Foto galeri berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus foto' },
      { status: 500 }
    );
  }
}
