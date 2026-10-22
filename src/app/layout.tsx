import type { Metadata } from 'next';
import './globals.css';
import { AdminAuthProvider } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'BikinKilat Admin Command Center | Pusat Kontrol Eksekutif',
  description: 'Panel kendali terpadu untuk analitik pendapatan, manajemen pengguna, saldo token, dan infrastruktur ekosistem BikinKilat.web.id.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  );
}
