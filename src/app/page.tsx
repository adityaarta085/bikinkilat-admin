'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Coins, 
  Users, 
  TrendingUp, 
  FileText, 
  Activity, 
  Search, 
  RefreshCw, 
  Sliders, 
  AlertTriangle, 
  Plus, 
  Minus, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  LogOut, 
  Check, 
  X, 
  ChevronRight, 
  Layers, 
  Zap, 
  Sparkles, 
  Database,
  ArrowUpRight,
  Filter,
  Download,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAdminAuth } from '@/lib/admin-auth';

interface UserItem {
  id: string;
  email: string;
  name: string;
  tokens: number;
  created_at: string;
  updated_at?: string;
}

interface TransactionItem {
  id: string;
  user_id: string;
  package_name: string;
  amount_idr: number;
  tokens_added: number;
  status: string;
  created_at: string;
}

interface AnalyticsData {
  summary: {
    totalRevenueIdr: number;
    totalUsers: number;
    totalTokensInCirculation: number;
    totalTokensPurchased: number;
    totalTokensConsumed: number;
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    totalDocumentsGenerated: number;
  };
  revenueChart: { date: string; label: string; revenue: number; txCount: number }[];
  recentTransactions: TransactionItem[];
  systemHealth: {
    gateway: string;
    supabaseDatabase: string;
    aiMultiModel: string;
    activeCronTriggers: string;
  };
}

export default function AdminDashboardPage() {
  const { user, session, isAdmin, isLoading: isAuthLoading, signOut } = useAdminAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'transactions' | 'settings'>('analytics');

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchTxQuery, setSearchTxQuery] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');

  // Token Adjustment Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [adjustAction, setAdjustAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(25);
  const [adjustReason, setAdjustReason] = useState('Bonus Loyalitas / Penyesuaian');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Settle State
  const [settlingTxId, setSettlingTxId] = useState<string | null>(null);

  // Load all admin data
  const fetchData = async () => {
    if (!user) return;
    setIsLoadingData(true);
    setActionFeedback(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || '',
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      // 1. Fetch Analytics
      const aRes = await fetch('/api/admin/analytics', { headers });
      if (aRes.ok) {
        const aJson = await aRes.json();
        if (aJson.success) setAnalytics(aJson.data);
      }

      // 2. Fetch Users
      const uRes = await fetch('/api/admin/users', { headers });
      if (uRes.ok) {
        const uJson = await uRes.json();
        if (uJson.success) setUsers(uJson.users);
      }

      // 3. Fetch Transactions
      const tRes = await fetch('/api/admin/transactions', { headers });
      if (tRes.ok) {
        const tJson = await tRes.json();
        if (tJson.success) setTransactions(tJson.transactions);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, isAuthLoading, session]);

  // Live Auto Refresh (30s)
  useEffect(() => {
    if (!autoRefresh || !user || !isAdmin) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, isAdmin, session]);

  // CSV Export for Users
  const exportUsersCSV = () => {
    if (!users.length) return;
    const header = ['ID', 'Email', 'Nama', 'Saldo Token', 'Tanggal Registrasi'];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.email}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      u.tokens,
      `"${u.created_at}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bikinkilat-users-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Transactions
  const exportTransactionsCSV = () => {
    if (!transactions.length) return;
    const header = ['ID Transaksi', 'User ID', 'Paket', 'Nominal (IDR)', 'Token Ditambah', 'Status', 'Waktu'];
    const rows = transactions.map((t) => [
      `"${t.id}"`,
      `"${t.user_id}"`,
      `"${(t.package_name || '').replace(/"/g, '""')}"`,
      t.amount_idr,
      t.tokens_added,
      `"${t.status}"`,
      `"${t.created_at}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bikinkilat-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Token Modification Submit
  const handleModifyTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !user) return;

    setIsSubmittingToken(true);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': user.email || '',
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: adjustAction,
          amount: Number(adjustAmount),
          reason: adjustReason,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengubah saldo token');
      }

      // Trigger Confetti
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
      } catch (err) {}

      setActionFeedback({
        type: 'success',
        message: result.message,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, tokens: result.data.newBalance } : u
        )
      );

      if (selectedUser) {
        setSelectedUser((prev) => (prev ? { ...prev, tokens: result.data.newBalance } : null));
      }

      // Refresh transactions and analytics in background
      fetchData();

      setTimeout(() => {
        setSelectedUser(null);
        setActionFeedback(null);
      }, 1800);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan sistem saat memperbarui token.',
      });
    } finally {
      setIsSubmittingToken(false);
    }
  };

  // Handle Manual Transaction Settlement
  const handleManualSettle = async (transactionId: string) => {
    if (!user || !confirm('Konfirmasi: Settle transaksi ini dan tambahkan token langsung ke pengguna?')) {
      return;
    }

    setSettlingTxId(transactionId);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': user.email || '',
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ transactionId }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error || 'Gagal melakukan settle manual');
      }
    } catch (e: any) {
      alert('Terjadi gangguan jaringan');
    } finally {
      setSettlingTxId(null);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!searchUserQuery) return users;
    const q = searchUserQuery.toLowerCase();
    return users.filter(
      (u) => u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.id.includes(q)
    );
  }, [users, searchUserQuery]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchStatus = txStatusFilter === 'all' || t.status === txStatusFilter;
      const matchSearch =
        !searchTxQuery ||
        t.package_name?.toLowerCase().includes(searchTxQuery.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTxQuery.toLowerCase()) ||
        t.user_id?.toLowerCase().includes(searchTxQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [transactions, txStatusFilter, searchTxQuery]);

  // Currency Formatter
  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // Date Formatter
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // If loading auth state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm font-bold">Memuat BikinKilat Command Center...</span>
        </div>
      </div>
    );
  }

  // Access Denied if not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Akses Super Admin Terbatas</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Halaman ini terenkripsi khusus untuk pemilik dan super administrator sistem ekosistem BikinKilat.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/auth"
              className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition"
            >
              Masuk dengan Akun Admin
            </Link>
            <a
              href="https://bikinkilat.web.id"
              className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Kembali ke Beranda Publik
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-2xl border-b border-slate-800 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-black text-base">
            BK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white tracking-tight">
                Command Center
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono block">
              admin.bikinkilat.web.id
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              autoRefresh
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80'
                : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
            }`}
            title="Otomatis memperbarui data setiap 30 detik"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>Auto (30s)</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={isLoadingData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Muat ulang seluruh data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          </button>

          <a
            href="https://bikinkilat.web.id/kasir"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700"
          >
            <span>Buka Kasir Publik</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Admin User Chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">
              A
            </div>
            <span className="text-xs font-bold text-slate-200 hidden md:inline truncate max-w-[150px]">
              {user.email}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={signOut}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 transition border border-slate-700"
            title="Keluar dari akun admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ringkasan &amp; Analitik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manajemen Pengguna &amp; Token</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Monitoring Transaksi QRIS</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {transactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Konfigurasi Ekosistem</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* TAB 1: EXECUTIVE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Pendapatan (GMV)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {formatRupiah(analytics?.summary.totalRevenueIdr || 0)}
                </div>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{analytics?.summary.completedTransactions || 0} Transaksi Berhasil</span>
                </p>
              </div>

              {/* Total Users */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pengguna Terdaftar
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {(analytics?.summary.totalUsers || 0).toLocaleString('id-ID')}
                </div>
                <p className="text-[11px] text-slate-400">
                  Akun terotentikasi di 9 studio dokumen
                </p>
              </div>

              {/* Tokens in Circulation */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Token Beredar Aktif
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Coins className="w-4 h-4 fill-amber-400" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  {(analytics?.summary.totalTokensInCirculation || 0).toLocaleString('id-ID')}
                </div>
                <p className="text-[11px] text-slate-400">
                  Saldo siap pakai oleh pelanggan
                </p>
              </div>

              {/* Documents Generated */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Dokumen Terbuat
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {(analytics?.summary.totalDocumentsGenerated || 0).toLocaleString('id-ID')}
                </div>
                <p className="text-[11px] text-slate-400">
                  Slide, Modul, CV, RAB, Surat, Faraidh
                </p>
              </div>
            </div>

            {/* Revenue Trend Chart & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 8 Cols: Revenue Chart */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">Tren Pendapatan Harian (7 Hari Terakhir)</h3>
                    <p className="text-xs text-slate-400">Grafik akumulasi pembayaran QRIS yang masuk</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                    Live Data
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-6 border-b border-slate-800 pb-2">
                  {analytics?.revenueChart.map((day, idx) => {
                    const maxRev = Math.max(...(analytics.revenueChart.map(d => d.revenue) || [100000]), 100000);
                    const heightPercent = Math.max(8, Math.round((day.revenue / maxRev) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition truncate max-w-full font-mono">
                          {formatRupiah(day.revenue)}
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 transition-all shadow-md shadow-emerald-500/10"
                        />
                        <span className="text-[11px] font-bold text-slate-400 truncate max-w-[60px]">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 4 Cols: System Status */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Status Infrastruktur
                  </h3>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">Edge Gateway (api)</span>
                      <span className="text-[11px] text-slate-400">api.bikinkilat.web.id</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {analytics?.systemHealth.gateway === 'online' ? 'Online' : 'Operational'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">Database Terpusat</span>
                      <span className="text-[11px] text-slate-400">User, Token, Transactions</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Terhubung
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">AI Multi-Model Edge</span>
                      <span className="text-[11px] text-slate-400">Qwen 3.8 + DeepSeek + Fallback</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Siap Pakai
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">Gateway QRIS Nasional</span>
                      <span className="text-[11px] text-slate-400">Qrispy API Integration</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Aktif 24/7
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT & TOKEN MODIFIER */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div>
                <h2 className="text-xl font-black text-white">Daftar Seluruh Pengguna</h2>
                <p className="text-xs text-slate-400">
                  Cari akun pengguna, periksa saldo, dan lakukan penyesuaian token langsung
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={exportUsersCSV}
                  disabled={users.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition border border-slate-700 disabled:opacity-50"
                  title="Unduh seluruh data pengguna ke format CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                {/* Search Bar */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Cari nama, email, atau ID..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-6">Pengguna</th>
                      <th className="py-4 px-6">ID Pengguna</th>
                      <th className="py-4 px-6 text-center">Saldo Token</th>
                      <th className="py-4 px-6">Terdaftar Sejak</th>
                      <th className="py-4 px-6 text-right">Aksi Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                          Tidak ada pengguna ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {u.email?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-white block">{u.name || 'Pengguna BikinKilat'}</span>
                                <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                            {u.id}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-950/80 text-amber-300 border border-amber-800/80">
                              <Coins className="w-3.5 h-3.5 fill-amber-300" />
                              <span>{u.tokens} Token</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 text-[11px]">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setAdjustAmount(25);
                                setAdjustAction('add');
                                setAdjustReason('Bonus Loyalitas / Penyesuaian');
                                setActionFeedback(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs border border-emerald-500/40 transition flex items-center gap-1.5 ml-auto"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Atur Token</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSACTION MONITORING */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div>
                <h2 className="text-xl font-black text-white">Monitoring Transaksi QRIS</h2>
                <p className="text-xs text-slate-400">
                  Audit pencatatan transaksi masuk dan penyelesaian manual jika diperlukan
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={exportTransactionsCSV}
                  disabled={transactions.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition border border-slate-700 disabled:opacity-50"
                  title="Unduh seluruh catatan transaksi ke format CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                {/* Status Filter */}
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="completed">Completed (Berhasil)</option>
                  <option value="pending">Pending (Menunggu)</option>
                  <option value="expired">Expired (Kedaluwarsa)</option>
                </select>

                {/* Search Box */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTxQuery}
                    onChange={(e) => setSearchTxQuery(e.target.value)}
                    placeholder="Cari ID atau paket..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-6">ID &amp; Paket</th>
                      <th className="py-4 px-6">ID Pengguna</th>
                      <th className="py-4 px-6">Nominal (IDR)</th>
                      <th className="py-4 px-6 text-center">Token</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6">Waktu</th>
                      <th className="py-4 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                          Tidak ada transaksi yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-6">
                            <span className="font-bold text-white block">{tx.package_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{tx.id}</span>
                          </td>
                          <td className="py-4 px-6 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                            {tx.user_id}
                          </td>
                          <td className="py-4 px-6 font-bold text-white">
                            {formatRupiah(tx.amount_idr)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`font-bold ${tx.tokens_added >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.tokens_added > 0 ? `+${tx.tokens_added}` : tx.tokens_added}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : tx.status === 'pending'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 text-[11px]">
                            {formatDate(tx.created_at)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {tx.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleManualSettle(tx.id)}
                                disabled={settlingTxId === tx.id}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[11px] border border-amber-500/40 transition disabled:opacity-50"
                              >
                                {settlingTxId === tx.id ? 'Memproses...' : 'Settle Manual'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM SETTINGS & ECOSYSTEM */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-white">Konfigurasi Ekosistem BikinKilat</h2>
                <p className="text-xs text-slate-400">
                  Daftar layanan terintegrasi dan parameter global
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  { name: 'Portal Utama', sub: 'bikinkilat.web.id', desc: 'Pusat Akun & Kasir Terpusat' },
                  { name: 'Slide & Makalah', sub: 'slide.bikinkilat.web.id', desc: 'Generator PPTX & Makalah DOCX' },
                  { name: 'Modul Ajar', sub: 'modul.bikinkilat.web.id', desc: 'Kurikulum Merdeka & Bank Soal' },
                  { name: 'CV ATS', sub: 'cv.bikinkilat.web.id', desc: 'Resume ATS & Cover Letter' },
                  { name: 'Kalkulator RAB', sub: 'rab.bikinkilat.web.id', desc: 'Anggaran Proyek & Event SNI' },
                  { name: 'Surat & Somasi', sub: 'surat.bikinkilat.web.id', desc: 'Draf Legal KUHPerdata Sah' },
                  { name: 'Waris Faraidh', sub: 'waris.bikinkilat.web.id', desc: 'Hitungan Waris KHI & Silsilah' },
                  { name: 'Proposal Bisnis', sub: 'proposal.bikinkilat.web.id', desc: 'Proposal Sponsorship & KUR' },
                  { name: 'Pas Foto SSCASN', sub: 'pasfoto.bikinkilat.web.id', desc: 'Studio Foto CPNS & BUMN' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">{item.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{item.sub}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Live
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: TOKEN ADJUSTMENT (TAMBAH / POTONG / SETEL TOKEN) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
                <Coins className="w-4 h-4 fill-emerald-400" />
                <span>Super Admin Token Control</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Atur Saldo Pengguna
              </h3>
              <p className="text-xs text-slate-400">
                Pengguna: <strong className="text-white">{selectedUser.name || selectedUser.email}</strong> ({selectedUser.email})
              </p>
            </div>

            {/* Current Balance Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Saldo Token Saat Ini:</span>
              <span className="text-xl font-black text-amber-400">
                {selectedUser.tokens} Token
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleModifyTokens} className="space-y-5">
              {/* Action Type: Add / Deduct / Set */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Pilih Tindakan Saldo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('add')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      adjustAction === 'add'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustAction('deduct')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      adjustAction === 'deduct'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Kurangi (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustAction('set')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      adjustAction === 'set'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>Setel Pas (=)</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Jumlah Token:
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-lg font-black text-white outline-none focus:border-emerald-500 transition"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 mr-1">Cepat:</span>
                  {[5, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustAmount(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Selector / Custom Reason */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Alasan Audit (Tercatat Abadi):
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Kompensasi gangguan sistem, Bonus loyalitas, Transfer bank manual..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Projected Outcome Preview */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-xs flex items-center justify-between text-indigo-200">
                <span>Perkiraan Saldo Baru Pengguna:</span>
                <strong className="text-white text-sm">
                  {adjustAction === 'add'
                    ? selectedUser.tokens + adjustAmount
                    : adjustAction === 'deduct'
                    ? Math.max(0, selectedUser.tokens - adjustAmount)
                    : adjustAmount}{' '}
                  Token
                </strong>
              </div>

              {/* Feedback Alert */}
              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {actionFeedback.message}
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingToken}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingToken ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Konfirmasi &amp; Terapkan Saldo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
