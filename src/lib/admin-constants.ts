export const PRIMARY_ADMIN_EMAIL = 'adityaarta085@gmail.com';

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const allowedList = [
    PRIMARY_ADMIN_EMAIL.toLowerCase(),
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ];
  return allowedList.includes(cleanEmail);
}
