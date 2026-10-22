import { createClient } from '@supabase/supabase-js';
import { crossSubdomainStorage } from './session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oonozobspxhvztoikakt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbm96b2JzcHhodnp0b2lrYWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMTg3ODUsImV4cCI6MjEwNzY5NDc4NX0.s2pJ8Fe4vrrXa2tlEcw5iRLTin7MvderFzCSsLLnbR4';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbm96b2JzcHhodnp0b2lrYWt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjExODc4NSwiZXhwIjoyMTA3Njk0Nzg1fQ.90XbGHkbyhebBUKKq1G3ZGnlYHjjDux5sRVpJH0tDts';

// Client-side Supabase instance synced across *.bikinkilat.web.id
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: crossSubdomainStorage,
    storageKey: 'bikinkilat_auth_session',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Server-side Admin instance with service_role key
export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
