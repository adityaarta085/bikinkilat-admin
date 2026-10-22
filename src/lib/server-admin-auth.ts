import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';
import { isSuperAdmin } from './admin-auth';

export interface AdminAuthResult {
  authorized: boolean;
  email?: string;
  userId?: string;
  error?: string;
  status: number;
}

/**
 * Validates request authentication strictly against Super Admin email whitelist.
 * Requires either:
 * 1. Cryptographically verified Supabase OAuth JWT Bearer token
 * 2. Or matching SUPABASE_SERVICE_ROLE_KEY via x-admin-secret header (for edge worker/cron)
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('authorization');
  const adminEmailHeader = req.headers.get('x-admin-email');

  // Check 1: Bearer Token verification via Supabase Auth
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) {
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

  // Check 2: Service Role Key check for system/edge-to-admin calls
  const adminSecret = req.headers.get('x-admin-secret');
  if (adminSecret && adminSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const email = adminEmailHeader || 'system-admin';
    return {
      authorized: true,
      email,
      userId: 'service-role',
      status: 200,
    };
  }

  // Check 3: If in development environment with matching x-admin-email
  if (process.env.NODE_ENV === 'development' && isSuperAdmin(adminEmailHeader)) {
    return {
      authorized: true,
      email: adminEmailHeader!,
      status: 200,
    };
  }

  return {
    authorized: false,
    error: 'Akses Ditolak: Hanya Super Admin terautentikasi yang diizinkan.',
    status: 403,
  };
}
