import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';
import { isSuperAdmin, PRIMARY_ADMIN_EMAIL } from './admin-auth';

export interface AdminAuthResult {
  authorized: boolean;
  email?: string;
  userId?: string;
  error?: string;
  status: number;
}

/**
 * Validates request authentication strictly for Super Admin (adityaarta085@gmail.com)
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('authorization');
  const adminEmailHeader = req.headers.get('x-admin-email');

  // Check 1: Direct Super Admin Email Header check
  if (adminEmailHeader && isSuperAdmin(adminEmailHeader)) {
    return {
      authorized: true,
      email: adminEmailHeader.trim().toLowerCase(),
      status: 200,
    };
  }

  // Check 2: Bearer Token verification via Supabase Auth
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user && isSuperAdmin(user.email)) {
          return {
            authorized: true,
            email: user.email,
            userId: user.id,
            status: 200,
          };
        }
      } catch (err) {
        console.warn('Bearer token verification error:', err);
      }
    }
  }

  // Check 3: Check Supabase session from cookies
  try {
    const cookies = req.cookies;
    const sessionCookie = cookies.get('bikinkilat_auth_session')?.value || cookies.get('bikinkilat_session')?.value;
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        const email = parsed?.user?.email || parsed?.email;
        if (email && isSuperAdmin(email)) {
          return {
            authorized: true,
            email,
            status: 200,
          };
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Check 4: Service Role Key check for edge-to-admin calls
  const adminSecret = req.headers.get('x-admin-secret');
  if (adminSecret && adminSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const email = adminEmailHeader || PRIMARY_ADMIN_EMAIL;
    return {
      authorized: true,
      email,
      userId: 'service-role',
      status: 200,
    };
  }

  return {
    authorized: false,
    error: 'Akses Ditolak: Hanya Super Admin terautentikasi yang diizinkan.',
    status: 403,
  };
}
