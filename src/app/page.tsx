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
  Radio,
  Bell,
  Send,
  Trash2,
  ShieldAlert,
  Gift,
  Flame,
  Mail,
  Info,
  Headphones,
  MessageSquare,
  Copy,
  Phone,
  CheckCircle2,
  Edit3,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAdminAuth, PRIMARY_ADMIN_EMAIL } from '@/lib/admin-auth';

interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_name: string;
  message: string;
  created_at: string;
}

interface SupportTicketItem {
  id: string;
  ticket_number: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  category: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  messages?: SupportTicketMessage[];
  user_tokens?: number | null;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  tokens: number;
  created_at: string;
  updated_at?: string;
}

interface NotificationAdminItem {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  is_popup: boolean;
  action_url?: string | null;
  tokens_granted?: number;
  created_at: string;
  created_by: string;
  read_count: number;
  target_user?: { email: string; name: string } | null;
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'transactions' | 'notifications' | 'support' | 'settings'>('analytics');

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationAdminItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchTxQuery, setSearchTxQuery] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [supportStats, setSupportStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<SupportTicketItem | null>(null);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportFilterStatus, setSupportFilterStatus] = useState<string>('all');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyStatus, setAdminReplyStatus] = useState<'open' | 'in_progress' | 'resolved'>('in_progress');
  const [dispatchUserNotification, setDispatchUserNotification] = useState(true);
  const [replyWithPopup, setReplyWithPopup] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [copiedTicketNo, setCopiedTicketNo] = useState(false);
  const [sendReplyEmail, setSendReplyEmail] = useState(true);
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editTicketCategory, setEditTicketCategory] = useState('');
  const [editTicketPriority, setEditTicketPriority] = useState('');
  const [editTicketSubject, setEditTicketSubject] = useState('');
  const [isSavingTicketEdit, setIsSavingTicketEdit] = useState(false);
  const [supportSourceFilter, setSupportSourceFilter] = useState<'all' | 'email' | 'web'>('all');
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  // Token Adjustment Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [adjustAction, setAdjustAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(25);
  const [adjustReason, setAdjustReason] = useState('Bonus Loyalitas / Penyesuaian');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Settle State
  const [settlingTxId, setSettlingTxId] = useState<string | null>(null);

  // Notification Dispatch Form State
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'user'>('all');
  const [notifSelectedUserId, setNotifSelectedUserId] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'urgent' | 'success'>('info');
  const [notifIsPopup, setNotifIsPopup] = useState(false);
  const [notifTokensGranted, setNotifTokensGranted] = useState<number>(0);
  const [notifActionUrl, setNotifActionUrl] = useState('');
  const [isSubmittingNotif, setIsSubmittingNotif] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bulk Broadcast Modal State
  const [isBulkSendOpen, setIsBulkSendOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState<number>(5);
  const [bulkReason, setBulkReason] = useState('Bonus Spesial Pengguna BikinKilat');
  const [bulkTriggerPopup, setBulkTriggerPopup] = useState(true);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Burn / Reset Token State
  const [burnTargetUser, setBurnTargetUser] = useState<UserItem | null>(null);
  const [burnReason, setBurnReason] = useState('Penalti Pelanggaran Ketentuan Layanan');
  const [isSubmittingBurn, setIsSubmittingBurn] = useState(false);

  // Load all admin data
  const fetchData = async () => {
    if (!user) return;
    setIsLoadingData(true);
    setActionFeedback(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || PRIMARY_ADMIN_EMAIL,
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const timestamp = Date.now();

      // 1. Fetch Analytics (bypassing browser & intermediate cache)
      const aRes = await fetch(`/api/admin/analytics?_t=${timestamp}`, { headers, cache: 'no-store' });
      if (aRes.ok) {
        const aJson = await aRes.json();
        if (aJson.success) setAnalytics(aJson.data);
      } else {
        console.warn('Analytics fetch error:', await aRes.text());
      }

      // 2. Fetch Users (bypassing browser & intermediate cache)
      const uRes = await fetch(`/api/admin/users?_t=${timestamp}`, { headers, cache: 'no-store' });
      if (uRes.ok) {
        const uJson = await uRes.json();
        if (uJson.success) setUsers(uJson.users);
      } else {
        console.warn('Users fetch error:', await uRes.text());
      }

      // 3. Fetch Transactions (bypassing browser & intermediate cache)
      const tRes = await fetch(`/api/admin/transactions?_t=${timestamp}`, { headers, cache: 'no-store' });
      if (tRes.ok) {
        const tJson = await tRes.json();
        if (tJson.success) setTransactions(tJson.transactions);
      } else {
        console.warn('Transactions fetch error:', await tRes.text());
      }

      // 4. Fetch Notifications (bypassing browser & intermediate cache)
      const nRes = await fetch(`/api/admin/notifications?_t=${timestamp}`, { headers, cache: 'no-store' });
      if (nRes.ok) {
        const nJson = await nRes.json();
        if (nJson.success) setNotifications(nJson.notifications || []);
      } else {
        console.warn('Notifications fetch error:', await nRes.text());
      }

      // 5. Fetch Support Tickets (bypassing browser & intermediate cache)
      const stRes = await fetch(`/api/admin/support/tickets?_t=${timestamp}`, { headers, cache: 'no-store' });
      if (stRes.ok) {
        const stJson = await stRes.json();
        if (stJson.success) {
          setSupportTickets(stJson.tickets || []);
          if (stJson.stats) setSupportStats(stJson.stats);
        }
      } else {
        console.warn('Support tickets fetch error:', await stRes.text());
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch single ticket details and conversation thread
  const fetchTicketDetail = async (ticketId: string) => {
    setIsLoadingDetail(true);
    setSelectedTicketId(ticketId);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || PRIMARY_ADMIN_EMAIL,
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/admin/support/tickets/${ticketId}?_t=${Date.now()}`, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.ticket) {
          setSelectedTicketDetail(data.ticket);
          setEditTicketCategory(data.ticket.category || 'Bantuan Umum');
          setEditTicketPriority(data.ticket.priority || 'normal');
          setEditTicketSubject(data.ticket.subject || '');
          setIsEditingTicket(false);
          setSendReplyEmail(Boolean(data.ticket.user_email));
          if (data.ticket.status === 'open') {
            setAdminReplyStatus('in_progress');
          } else if (data.ticket.status === 'resolved' || data.ticket.status === 'closed') {
            setAdminReplyStatus('resolved');
          } else {
            setAdminReplyStatus(data.ticket.status);
          }
        }
      }
    } catch (err) {
      console.error('Error loading ticket detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Save Ticket Edit (Category, Priority, Subject)
  const handleSaveTicketEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setIsSavingTicketEdit(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || PRIMARY_ADMIN_EMAIL,
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/admin/support/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          category: editTicketCategory,
          priority: editTicketPriority,
          subject: editTicketSubject,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditingTicket(false);
        await fetchTicketDetail(selectedTicketId);
        await fetchData();
      } else {
        alert(data.error || 'Gagal menyimpan perubahan tiket.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan perubahan tiket.');
    } finally {
      setIsSavingTicketEdit(false);
    }
  };

  // Handle Admin reply submission
  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !adminReplyText.trim()) return;
    setIsSendingReply(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || PRIMARY_ADMIN_EMAIL,
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/admin/support/tickets/${selectedTicketId}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: adminReplyText.trim(),
          status: adminReplyStatus,
          notify_user: dispatchUserNotification,
          is_popup: replyWithPopup,
          send_email: sendReplyEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const replyMsg = adminReplyText.trim();
        setAdminReplyText('');
        await fetchTicketDetail(selectedTicketId);
        await fetchData();
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });

        // If email dispatch had a note or wasn't sent, notify admin & prompt Gmail compose
        if (sendReplyEmail && selectedTicketDetail?.user_email && !data.email_sent) {
          const openGmail = window.confirm(
            `Balasan resmi tersimpan di tiket!\n\nCatatan Email: ${data.email_note || 'Kunci API pengirim email belum aktif'}.\n\nApakah Anda ingin membuka Gmail sekarang untuk mengirimkan balasan ini langsung ke ${selectedTicketDetail.user_email}?`
          );
          if (openGmail) {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
              selectedTicketDetail.user_email
            )}&su=${encodeURIComponent(
              `Re: [${selectedTicketDetail.ticket_number}] ${selectedTicketDetail.subject}`
            )}&body=${encodeURIComponent(
              `Halo ${selectedTicketDetail.user_name || 'Pelanggan BikinKilat'},\n\n${replyMsg}\n\n---\nTim Customer Support BikinKilat\nWebsite: https://bikinkilat.web.id\nNomor Tiket: #${selectedTicketDetail.ticket_number}\nEmail Bantuan: support@bikinkilat.web.id`
            )}`;
            window.open(gmailUrl, '_blank');
          }
        }
      } else {
        alert(data.error || 'Gagal mengirim balasan.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim balasan.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle permanently deleting a ticket and all its messages
  const handleDeleteTicket = async (ticketId: string, ticketNumber: string) => {
    const isConfirmed = window.confirm(
      `HAPUS TIKET SECARA PERMANEN?\n\nNomor Tiket: #${ticketNumber}\n\nPeringatan: Seluruh data percakapan tiket ini akan DIHAPUS BERSIH secara permanen dari basis data dan tidak dapat dipulihkan kembali.`
    );
    if (!isConfirmed) return;

    setIsDeletingTicket(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || PRIMARY_ADMIN_EMAIL,
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (selectedTicketId === ticketId) {
          setSelectedTicketId(null);
          setSelectedTicketDetail(null);
        }
        await fetchData();
        alert(`Tiket #${ticketNumber} berhasil dihapus permanen dari sistem.`);
      } else {
        alert(data.error || 'Gagal menghapus tiket.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus tiket.');
    } finally {
      setIsDeletingTicket(false);
    }
  };

  // Handle quick status update (without reply message)
  const handleQuickUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user?.email || PRIMARY_ADMIN_EMAIL,
      };
      if (session?.access_token) {
        headers['authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTicketDetail(ticketId);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
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
          'x-admin-email': user.email || PRIMARY_ADMIN_EMAIL,
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
          'x-admin-email': user.email || PRIMARY_ADMIN_EMAIL,
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

  // Handle Send Notification & Warning
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmittingNotif) return;
    setIsSubmittingNotif(true);
    setNotifFeedback(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': user.email || PRIMARY_ADMIN_EMAIL,
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          target_type: notifTargetType,
          user_id: notifTargetType === 'user' ? notifSelectedUserId : null,
          is_popup: notifIsPopup,
          tokens_granted: Number(notifTokensGranted) || 0,
          action_url: notifActionUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim notifikasi');
      }

      setNotifFeedback({ type: 'success', message: data.message });
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
      } catch (err) {}

      // Reset form
      setNotifTitle('');
      setNotifMessage('');
      setNotifTokensGranted(0);
      setNotifActionUrl('');
      setNotifIsPopup(false);

      fetchData();
    } catch (err: any) {
      setNotifFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsSubmittingNotif(false);
    }
  };

  // Handle Delete Notification
  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Yakin ingin menghapus notifikasi ini dari sistem?')) return;

    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-email': user?.email || PRIMARY_ADMIN_EMAIL,
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        alert(data.error || 'Gagal menghapus notifikasi');
      }
    } catch (err) {
      alert('Gagal menghapus notifikasi');
    }
  };

  // Handle Bulk Broadcast Tokens to ALL users
  const handleBulkBroadcastTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmittingBulk) return;
    if (!confirm(`Konfirmasi: Bagikan +${bulkAmount} token ke SEMUA (${users.length}) pengguna terdaftar?`)) return;

    setIsSubmittingBulk(true);
    try {
      const res = await fetch('/api/admin/tokens/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': user.email || PRIMARY_ADMIN_EMAIL,
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'broadcast_add',
          amount: Number(bulkAmount),
          reason: bulkReason,
          triggerPopup: bulkTriggerPopup,
          popupTitle: `🎉 Bonus Spesial: +${bulkAmount} Token Diterima!`,
          popupMessage: `Selamat! Super Admin telah membagikan ${bulkAmount} token gratis ke seluruh pengguna: "${bulkReason}". Token Anda sudah aktif dan siap digunakan.`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal broadcast token');

      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
      } catch (err) {}

      alert(data.message);
      setIsBulkSendOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal broadcast token');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Handle Burn / Reset User Tokens
  const handleBurnUserTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!burnTargetUser || !user || isSubmittingBurn) return;
    if (!confirm(`TINDAKAN KERAS: Hanguskan seluruh saldo token (${burnTargetUser.tokens} token) milik ${burnTargetUser.email} dan pasang Pop-up Peringatan Teguran saat ia masuk lagi?`)) return;

    setIsSubmittingBurn(true);
    try {
      const res = await fetch('/api/admin/tokens/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': user.email || PRIMARY_ADMIN_EMAIL,
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'burn_reset',
          userId: burnTargetUser.id,
          reason: burnReason,
          popupTitle: '⚠️ Peringatan Teguran: Saldo Token Direset',
          popupMessage: `Akun Anda telah dikenai penalti oleh Super Admin karena alasan: "${burnReason}". Seluruh saldo token Anda (${burnTargetUser.tokens} token) telah direset menjadi 0. Harap gunakan sistem dengan tertib.`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal reset token');

      alert(data.message);
      setBurnTargetUser(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal reset token');
    } finally {
      setIsSubmittingBurn(false);
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

  // Filtered Support Tickets (Split between Email Masuk & Tiket Web)
  const emailTicketsCount = useMemo(() => {
    return supportTickets.filter(
      (t) => t.category === 'Email Masuk' || t.category === 'Email Bantuan' || (!t.user_id && t.user_email)
    ).length;
  }, [supportTickets]);

  const webTicketsCount = useMemo(() => {
    return Math.max(0, supportTickets.length - emailTicketsCount);
  }, [supportTickets, emailTicketsCount]);

  const filteredTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      // 1. Source filter (Email vs Web)
      const isEmailTicket =
        t.category === 'Email Masuk' || t.category === 'Email Bantuan' || (!t.user_id && t.user_email);
      if (supportSourceFilter === 'email' && !isEmailTicket) return false;
      if (supportSourceFilter === 'web' && isEmailTicket) return false;

      // 2. Status filter
      const matchStatus = supportFilterStatus === 'all' || t.status === supportFilterStatus;

      // 3. Search query
      const matchSearch =
        !supportSearch ||
        t.ticket_number?.toLowerCase().includes(supportSearch.toLowerCase()) ||
        t.subject?.toLowerCase().includes(supportSearch.toLowerCase()) ||
        t.user_name?.toLowerCase().includes(supportSearch.toLowerCase()) ||
        (t.user_email && t.user_email.toLowerCase().includes(supportSearch.toLowerCase())) ||
        t.category?.toLowerCase().includes(supportSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [supportTickets, supportSourceFilter, supportFilterStatus, supportSearch]);

  // WhatsApp helper
  const getWhatsAppUrl = (phone: string, ticketNum: string, userName: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const greeting = encodeURIComponent(`Halo ${userName}, kami dari Customer Support BikinKilat menindaklanjuti tiket bantuan #${ticketNum}. Bagaimana kami dapat membantu Anda hari ini?`);
    return `https://wa.me/${formattedPhone}?text=${greeting}`;
  };

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
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Pusat Notifikasi</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'support'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Tiket Bantuan &amp; CS</span>
            {supportStats.open > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-sm">
                {supportStats.open} Baru
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {supportTickets.length}
              </span>
            )}
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

              <div className="flex flex-wrap items-center gap-3">
                {/* Bulk Broadcast Button */}
                <button
                  type="button"
                  onClick={() => setIsBulkSendOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                  title="Bagikan token bonus ke semua pengguna terdaftar"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Broadcast Token (+Semua)</span>
                </button>

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
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Send Direct Warning / Notification */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('notifications');
                                  setNotifTargetType('user');
                                  setNotifSelectedUserId(u.id);
                                  setNotifTitle('⚠️ Peringatan Penggunaan Akun');
                                  setNotifType('warning');
                                  setNotifIsPopup(true);
                                }}
                                className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition"
                                title="Kirim Peringatan Pop-up ke Pengguna Ini"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>

                              {/* Burn / Reset Tokens */}
                              <button
                                type="button"
                                onClick={() => setBurnTargetUser(u)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                                title="Hanguskan Seluruh Saldo Token Pengguna (Penalti)"
                              >
                                <Flame className="w-3.5 h-3.5" />
                              </button>

                              {/* Adjust Token Balance */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setAdjustAmount(25);
                                  setAdjustAction('add');
                                  setAdjustReason('Bonus Loyalitas / Penyesuaian');
                                  setActionFeedback(null);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs border border-emerald-500/40 transition flex items-center gap-1.5"
                              >
                                <Coins className="w-3.5 h-3.5" />
                                <span>Atur Token</span>
                              </button>
                            </div>
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

        {/* TAB 4: NOTIFICATION CENTER */}
        {activeTab === 'notifications' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Form Section: Send & Broadcast Notification */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">Kirim Notifikasi &amp; Peringatan Pop-Up</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-950 text-indigo-400 border border-indigo-800">
                      Multi-Channel
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Kirim pesan resmi, peringatan teguran keras, atau hadiah token gratis ke pengguna
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-5">
                {/* Grid row 1: Target & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Target Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Target Penerima:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNotifTargetType('all')}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                          notifTargetType === 'all'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <span>🌐 Seluruh Pengguna</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifTargetType('user')}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                          notifTargetType === 'user'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <span>👤 Pengguna Tertentu</span>
                      </button>
                    </div>
                  </div>

                  {/* Notification Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Tipe Notifikasi:
                    </label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      <option value="info">ℹ️ Informasi Biasa (Biru)</option>
                      <option value="warning">⚠️ Peringatan Teguran (Kuning/Oranye)</option>
                      <option value="urgent">🚨 Tindakan Tegas / Penalti (Merah)</option>
                      <option value="success">🎁 Hadiah Token / Promo (Hijau)</option>
                    </select>
                  </div>
                </div>

                {/* Specific User Selector if target_type === 'user' */}
                {notifTargetType === 'user' && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-slate-300 block">
                      Pilih Akun Pengguna:
                    </label>
                    <select
                      value={notifSelectedUserId}
                      onChange={(e) => setNotifSelectedUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                      required
                    >
                      <option value="">-- Pilih salah satu pengguna ({users.length} akun terdaftar) --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email} ({u.name || 'User'}) — Saldo: {u.tokens} Token
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Judul Notifikasi:
                  </label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Contoh: ⚠️ Peringatan Penggunaan Akun / 🎉 Klaim Bonus 10 Token Anda!"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Isi Pesan Notifikasi:
                  </label>
                  <textarea
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Tuliskan pesan lengkap yang akan dibaca pengguna saat masuk..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 leading-relaxed"
                    required
                  />
                </div>

                {/* Options Grid: Popup & Token Gift */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {/* Toggle Popup Modal */}
                  <label className="sm:col-span-1 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-start gap-3 transition">
                    <input
                      type="checkbox"
                      checked={notifIsPopup}
                      onChange={(e) => setNotifIsPopup(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">
                        Wajibkan Pop-Up Modal
                      </span>
                      <span className="text-[11px] text-slate-400 block leading-tight">
                        Muncul memblokir layar saat pengguna masuk kembali
                      </span>
                    </div>
                  </label>

                  {/* Token Gift Amount */}
                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Bonus Token (Opsional):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={notifTokensGranted}
                      onChange={(e) => setNotifTokensGranted(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-black outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Action Link */}
                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Tautan Tombol Aksi (Opsional):
                    </label>
                    <input
                      type="url"
                      value={notifActionUrl}
                      onChange={(e) => setNotifActionUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Feedback */}
                {notifFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold ${
                      notifFeedback.type === 'success'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {notifFeedback.message}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingNotif}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingNotif ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengirimkan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Kirimkan Notifikasi &amp; Pasang Peringatan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* List Section: Notifications History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Riwayat Notifikasi &amp; Peringatan Terkirim</h3>
                  <p className="text-xs text-slate-400">
                    Daftar seluruh pesan siaran dan peringatan aktif di ekosistem
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                  Total: {notifications.length}
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Belum ada notifikasi yang pernah dikirimkan.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 overflow-x-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-2xl transition">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              n.type === 'urgent'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : n.type === 'warning'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : n.type === 'success'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}
                          >
                            {n.type}
                          </span>

                          {n.is_popup && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-950 text-purple-400 border border-purple-800 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Modal Pop-up Aktif
                            </span>
                          )}

                          <span className="text-xs font-bold text-white">
                            {n.title}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl line-clamp-2">
                          {n.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                          <span>
                            Target:{' '}
                            <strong className="text-slate-200">
                              {n.user_id ? n.target_user?.email || n.user_id : '🌐 Seluruh Pengguna'}
                            </strong>
                          </span>
                          {n.tokens_granted && n.tokens_granted > 0 ? (
                            <span className="text-emerald-400 font-bold">
                              🎁 +{n.tokens_granted} Token
                            </span>
                          ) : null}
                          <span>Dibaca: <strong className="text-emerald-400">{n.read_count} pengguna</strong></span>
                          <span>Waktu: {formatDate(n.created_at)}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(n.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                          title="Hapus notifikasi ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT TICKETS & CUSTOMER SERVICE DESK */}
        {activeTab === 'support' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">Total Tiket Masuk</span>
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-white">{supportStats.total}</div>
                <div className="text-[11px] text-slate-500">Semua laporan &amp; pertanyaan</div>
              </div>

              <div className="bg-slate-900 border border-amber-900/40 rounded-3xl p-5 space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold">Menunggu CS</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
                  <span>{supportStats.open}</span>
                  {supportStats.open > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                      Prioritas
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-300/70">Perlu ditindaklanjuti admin</div>
              </div>

              <div className="bg-slate-900 border border-blue-900/40 rounded-3xl p-5 space-y-2">
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-xs font-bold">Sedang Ditangani</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-blue-400">{supportStats.in_progress}</div>
                <div className="text-[11px] text-blue-300/70">Dalam proses investigasi</div>
              </div>

              <div className="bg-slate-900 border border-emerald-900/40 rounded-3xl p-5 space-y-2">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-bold">Selesai Solutif</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">{supportStats.resolved}</div>
                <div className="text-[11px] text-emerald-300/70">Terselesaikan &amp; ditutup</div>
              </div>
            </div>

            {/* Support Desk 2-Column Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Ticket List & Search (5 cols) */}
              <div className="lg:col-span-5 xl:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-sm">
                    <Headphones className="w-4 h-4 text-emerald-400" />
                    <span>Tiket Bantuan Masuk</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Muat ulang tiket"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supportSearch}
                    onChange={(e) => setSupportSearch(e.target.value)}
                    placeholder="Cari tiket, nama, email..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Source Filter: Email Masuk vs Web Portal */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSupportSourceFilter('all')}
                    className={`py-1.5 px-2 rounded-lg transition text-center ${
                      supportSourceFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({supportTickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupportSourceFilter('email')}
                    className={`py-1.5 px-2 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                      supportSourceFilter === 'email'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-cyan-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email ({emailTicketsCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupportSourceFilter('web')}
                    className={`py-1.5 px-2 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                      supportSourceFilter === 'web'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-indigo-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Web ({webTicketsCount})</span>
                  </button>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                  {[
                    { id: 'all', label: `Semua (${supportStats.total})` },
                    { id: 'open', label: `Menunggu (${supportStats.open})` },
                    { id: 'in_progress', label: `Diproses (${supportStats.in_progress})` },
                    { id: 'resolved', label: `Selesai (${supportStats.resolved})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSupportFilterStatus(tab.id)}
                      className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
                        supportFilterStatus === tab.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Ticket Cards List */}
                <div className="max-h-[620px] overflow-y-auto space-y-2.5 pr-1">
                  {filteredTickets.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <Headphones className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs">Tidak ada tiket bantuan yang cocok.</p>
                    </div>
                  ) : (
                    filteredTickets.map((t) => {
                      const isSelected = selectedTicketId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => fetchTicketDetail(t.id)}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer text-left space-y-2 ${
                            isSelected
                              ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                              : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50">
                              #{t.ticket_number}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.status === 'open'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : t.status === 'in_progress'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {t.status === 'open'
                                ? 'Menunggu CS'
                                : t.status === 'in_progress'
                                ? 'Diproses'
                                : 'Selesai'}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-white line-clamp-1">
                              {t.subject}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {t.user_name} {t.user_email ? `• ${t.user_email}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                              {t.category === 'Email Bantuan' || (t.user_email && !t.user_id) ? (
                                <span className="flex items-center gap-1 text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                  <Mail className="w-2.5 h-2.5" />
                                  <span>Email Masuk</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>Portal Web</span>
                                </span>
                              )}
                              <span className="truncate">{t.category}</span>
                            </div>
                            <span>{formatDate(t.created_at)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Ticket Conversation & CS Action Panel (7 cols) */}
              <div className="lg:col-span-7 xl:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                {!selectedTicketDetail ? (
                  <div className="py-24 text-center space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
                      <Headphones className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-white">
                        Pilih Tiket untuk Mulai Percakapan
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Pilih tiket di sebelah kiri untuk melihat pesan pengguna, mengecek saldo akun, membuka kontak WhatsApp, dan mengirim tanggapan resmi CS dengan notifikasi otomatis.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Header Detail Tiket */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                            #{selectedTicketDetail.ticket_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTicketDetail.ticket_number);
                              setCopiedTicketNo(true);
                              setTimeout(() => setCopiedTicketNo(false), 2000);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-white bg-slate-900 border border-slate-800 text-[10px] flex items-center gap-1 transition"
                            title="Salin nomor tiket"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedTicketNo ? 'Tersalin!' : 'Salin'}</span>
                          </button>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                            {selectedTicketDetail.category}
                          </span>
                        </div>

                        {/* Quick Actions & Edit Button */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Quick Gmail Compose Button */}
                          {selectedTicketDetail.user_email && (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                                selectedTicketDetail.user_email
                              )}&su=${encodeURIComponent(
                                `Re: [${selectedTicketDetail.ticket_number}] ${selectedTicketDetail.subject}`
                              )}&body=${encodeURIComponent(
                                `Halo ${selectedTicketDetail.user_name || 'Pelanggan BikinKilat'},\n\nTerima kasih telah menghubungi Customer Support BikinKilat.\n\n---\nTim Customer Support BikinKilat\nWebsite: https://bikinkilat.web.id\nNomor Tiket: #${selectedTicketDetail.ticket_number}\nEmail Bantuan: support@bikinkilat.web.id`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60 flex items-center gap-1 shadow-sm"
                              title="Buka compose Gmail untuk membalas email pengguna secara langsung"
                            >
                              <Mail className="w-3 h-3 text-rose-400" />
                              <span>Balas di Gmail</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setIsEditingTicket(!isEditingTicket)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition bg-slate-900 text-amber-400 border-amber-900/50 hover:bg-amber-950/50 flex items-center gap-1"
                            title="Edit data tiket"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isEditingTicket ? 'Tutup Edit' : 'Edit Tiket'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickUpdateStatus(selectedTicketDetail.id, 'in_progress')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              selectedTicketDetail.status === 'in_progress'
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-900 text-blue-400 border-blue-900/50 hover:bg-blue-950/50'
                            }`}
                          >
                            Proses
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickUpdateStatus(selectedTicketDetail.id, 'resolved')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              selectedTicketDetail.status === 'resolved'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-900 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/50'
                            }`}
                          >
                            Tandai Selesai
                          </button>

                          {/* Permanently Delete Ticket Button */}
                          <button
                            type="button"
                            disabled={isDeletingTicket}
                            onClick={() => handleDeleteTicket(selectedTicketDetail.id, selectedTicketDetail.ticket_number)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition bg-red-950/60 text-red-400 border-red-800/60 hover:bg-red-900 hover:text-white flex items-center gap-1 disabled:opacity-50"
                            title="Hapus tiket dan seluruh percakapan secara permanen dari database"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>{isDeletingTicket ? 'Menghapus...' : 'Hapus Tiket'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Form */}
                      {isEditingTicket ? (
                        <form
                          onSubmit={handleSaveTicketEdit}
                          className="p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/40 space-y-3 shadow-lg"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                            <span>✏️ Perbarui Data Tiket #{selectedTicketDetail.ticket_number}</span>
                            <span className="text-[10px] text-slate-400">Tersimpan ke database</span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-300 font-semibold block">Subjek / Masalah Tiket:</label>
                            <input
                              type="text"
                              value={editTicketSubject}
                              onChange={(e) => setEditTicketSubject(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] text-slate-300 font-semibold block">Kategori:</label>
                              <select
                                value={editTicketCategory}
                                onChange={(e) => setEditTicketCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                              >
                                <option value="Bantuan Umum">Bantuan Umum</option>
                                <option value="Email Bantuan">Email Bantuan (support@bikinkilat.web.id)</option>
                                <option value="Kendala Transaksi/QRIS">Kendala Transaksi / QRIS</option>
                                <option value="Aktivasi Token">Aktivasi Token</option>
                                <option value="Fitur Dokumen/Slide">Fitur Dokumen & Slide</option>
                                <option value="Akun & Login">Akun & Login</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-slate-300 font-semibold block">Tingkat Prioritas:</label>
                              <select
                                value={editTicketPriority}
                                onChange={(e) => setEditTicketPriority(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                              >
                                <option value="low">Rendah (Low)</option>
                                <option value="normal">Normal</option>
                                <option value="high">Tinggi (High)</option>
                                <option value="urgent">Mendesak (Urgent)</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsEditingTicket(false)}
                              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 transition"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingTicketEdit}
                              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition disabled:opacity-50"
                            >
                              {isSavingTicketEdit ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span>Simpan Perubahan</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-black text-white">
                            {selectedTicketDetail.subject}
                          </h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                            Prioritas: <strong className="text-white uppercase">{selectedTicketDetail.priority || 'NORMAL'}</strong>
                          </span>
                        </div>
                      )}

                      {/* Customer Info Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400 text-[11px] block">Pelapor / Pengguna:</span>
                          <span className="font-bold text-white block">
                            {selectedTicketDetail.user_name}
                          </span>
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <span>Email:</span>
                            {selectedTicketDetail.user_email ? (
                              <a
                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                                  selectedTicketDetail.user_email
                                )}&su=${encodeURIComponent(
                                  `Re: [${selectedTicketDetail.ticket_number}] ${selectedTicketDetail.subject}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-rose-400 hover:text-rose-300 hover:underline font-mono flex items-center gap-1 font-bold"
                                title="Klik untuk membuka compose Gmail"
                              >
                                <span>{selectedTicketDetail.user_email}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            ) : (
                              <span>Tidak dicantumkan</span>
                            )}
                          </div>
                          {selectedTicketDetail.user_phone && (
                            <span className="text-slate-400 text-[11px] block">
                              WhatsApp / HP: {selectedTicketDetail.user_phone}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:items-end justify-between gap-2">
                          {/* User tokens & Quick Adjust Button */}
                          {selectedTicketDetail.user_tokens !== undefined && selectedTicketDetail.user_tokens !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-800/60 font-bold text-xs">
                                🪙 {selectedTicketDetail.user_tokens} Token
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser({
                                    id: selectedTicketDetail.user_id || '',
                                    email: selectedTicketDetail.user_email || '',
                                    name: selectedTicketDetail.user_name || '',
                                    tokens: selectedTicketDetail.user_tokens || 0,
                                    created_at: selectedTicketDetail.created_at,
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold transition"
                                title="Buka modal atur token untuk pengguna ini"
                              >
                                Atur Saldo
                              </button>
                            </div>
                          ) : null}

                          {/* WhatsApp Direct Action Button */}
                          {selectedTicketDetail.user_phone && (
                            <a
                              href={getWhatsAppUrl(
                                selectedTicketDetail.user_phone,
                                selectedTicketDetail.ticket_number,
                                selectedTicketDetail.user_name
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Hubungi via WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chat Messages Thread */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 min-h-[300px] max-h-[460px] overflow-y-auto space-y-3.5">
                      {selectedTicketDetail.messages?.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          Belum ada pesan dalam tiket ini.
                        </div>
                      ) : (
                        selectedTicketDetail.messages?.map((msg) => {
                          const isAdminSender = msg.sender_type === 'admin';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isAdminSender ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 shadow-md ${
                                  isAdminSender
                                    ? 'bg-emerald-950/70 border border-emerald-700/60 text-slate-100 rounded-tr-sm'
                                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3 text-[10px]">
                                  <span
                                    className={`font-black ${
                                      isAdminSender ? 'text-emerald-400' : 'text-slate-400'
                                    }`}
                                  >
                                    {isAdminSender ? '🛡️ CS BikinKilat (Admin)' : msg.sender_name}
                                  </span>
                                  <span className="text-slate-500">{formatDate(msg.created_at)}</span>
                                </div>
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                  {msg.message}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Canned Responses */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400">
                        Template Balasan Cepat (Klik untuk menyisipkan):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Halo! Kami sedang memproses kendala Anda secepat mungkin.',
                          'Saldo token Anda telah kami tambahkan ke akun Anda. Mohon cek halaman kasir Anda.',
                          'Kendala teknis telah berhasil diperbaiki oleh tim sistem. Silakan coba kembali fitur tersebut.',
                          'Tiket bantuan ini telah kami selesaikan. Hubungi kami jika masih butuh bantuan!',
                        ].map((canned, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAdminReplyText(canned)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-left"
                          >
                            {canned.slice(0, 42)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Identity Privacy Protection Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-300">
                          Identitas Pengirim Resmi:{' '}
                          <strong className="text-emerald-400 font-mono">
                            Customer Support BikinKilat &lt;support@bikinkilat.web.id&gt;
                          </strong>
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-400/80 font-medium bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                        🔒 Email pribadi admin tersembunyi aman
                      </span>
                    </div>

                    {/* Admin Reply Form */}
                    <form onSubmit={handleAdminReply} className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 block">
                          Tuliskan Balasan Resmi CS:
                        </label>
                        <textarea
                          rows={3}
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder="Tulis pesan penyelesaian atau konfirmasi kepada pengguna..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                          required
                        />
                      </div>

                      {/* Options & Submit */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Next Status */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400">Status Baru:</span>
                            <select
                              value={adminReplyStatus}
                              onChange={(e) => setAdminReplyStatus(e.target.value as any)}
                              className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                            >
                              <option value="in_progress">Tetap Diproses (In Progress)</option>
                              <option value="resolved">Selesai Solutif (Resolved)</option>
                              <option value="open">Menunggu Tanggapan (Open)</option>
                            </select>
                          </div>

                          {/* Checkbox: Dispatch Notification */}
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={dispatchUserNotification}
                              onChange={(e) => setDispatchUserNotification(e.target.checked)}
                              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
                            />
                            <span>Kirim notifikasi ke akun user</span>
                          </label>

                          {/* Checkbox: Dispatch Outbound Email */}
                          {selectedTicketDetail.user_email && (
                            <label className="flex items-center gap-1.5 text-xs text-cyan-300 cursor-pointer select-none bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-800/40">
                              <input
                                type="checkbox"
                                checked={sendReplyEmail}
                                onChange={(e) => setSendReplyEmail(e.target.checked)}
                                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900"
                              />
                              <Mail className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="truncate max-w-[200px]" title={selectedTicketDetail.user_email}>
                                Kirim email ke {selectedTicketDetail.user_email}
                              </span>
                            </label>
                          )}

                          {/* Checkbox: Popup alert */}
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={replyWithPopup}
                              onChange={(e) => setReplyWithPopup(e.target.checked)}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                            />
                            <span>Pop-up layar</span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingReply || !adminReplyText.trim()}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 transition shadow-md shadow-emerald-600/20"
                        >
                          {isSendingReply ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Mengirim...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Kirim Tanggapan Resmi</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM SETTINGS & ECOSYSTEM */}
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

      {/* MODAL: BROADCAST TOKEN TO ALL USERS */}
      {isBulkSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsBulkSendOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Broadcast Token ke Semua Pengguna</h3>
                <p className="text-xs text-slate-400">
                  Bagikan token gratis secara serentak ke {users.length} akun terdaftar
                </p>
              </div>
            </div>

            <form onSubmit={handleBulkBroadcastTokens} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Jumlah Token per Pengguna:
                </label>
                <input
                  type="number"
                  min="1"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-lg font-black text-white outline-none focus:border-indigo-500"
                  required
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Preset:</span>
                  {[3, 5, 10, 20, 50].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBulkAmount(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition"
                    >
                      +{p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Alasan / Keterangan Audit:
                </label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Contoh: Promo Spesial Hari Kemerdekaan, Bonus Peluncuran Ekosistem..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-start gap-3 transition">
                <input
                  type="checkbox"
                  checked={bulkTriggerPopup}
                  onChange={(e) => setBulkTriggerPopup(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    Kirim Pop-Up Sambutan Saat Pengguna Masuk
                  </span>
                  <span className="text-[11px] text-slate-400 block leading-tight">
                    Pengguna langsung melihat dialog selamat &amp; konfeti bonus token
                  </span>
                </div>
              </label>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-xs flex items-center justify-between text-indigo-200">
                <span>Total Token yang Akan Dikeluarkan:</span>
                <strong className="text-white text-sm">
                  {bulkAmount * users.length} Token ({users.length} Pengguna)
                </strong>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkSendOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBulk}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingBulk ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Membagikan Token...</span>
                    </>
                  ) : (
                    <span>Siarkan &amp; Bagikan Sekarang</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BURN / RESET USER TOKENS */}
      {burnTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setBurnTargetUser(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Hanguskan / Reset Saldo Token</h3>
                <p className="text-xs text-rose-400 font-semibold">
                  Tindakan Penalti &amp; Pemulihan Saldo Ilegal
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Pengguna Target:</span>
                <strong className="text-white font-mono">{burnTargetUser.email}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Saldo Saat Ini yang Akan Dihanguskan:</span>
                <strong className="text-rose-400 text-sm font-black">{burnTargetUser.tokens} Token -&gt; 0 Token</strong>
              </div>
            </div>

            <form onSubmit={handleBurnUserTokens} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Alasan Penalti (Tercatat Abadi &amp; Ditampilkan ke Pengguna):
                </label>
                <input
                  type="text"
                  value={burnReason}
                  onChange={(e) => setBurnReason(e.target.value)}
                  placeholder="Contoh: Eksploitasi celah pembayaran, Pelanggaran Terms of Service..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-200 block">Pemberitahuan Otomatis:</span>
                <p>
                  Sistem akan otomatis memasang <strong>Modal Pop-Up Peringatan Teguran</strong> yang wajib dibaca saat pengguna ini membuka web BikinKilat kembali.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBurnTargetUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBurn}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingBurn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Hanguskan Saldo Sekarang</span>
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
