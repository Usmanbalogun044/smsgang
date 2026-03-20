'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { User, PaginatedResponse } from '@/lib/types';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';

interface UserStats {
    total_users: number;
    new_this_month: number;
    admins: number;
    suspended: number;
}

export default function UsersPage() {
    const [data, setData] = useState<PaginatedResponse<User> | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');

    // Fetch Users
    const fetchUsers = async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            const params = new URLSearchParams({ page: String(page) });
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);

            const { data } = await api.get<PaginatedResponse<User>>(`/admin/users?${params.toString()}`);
            setData(data);
        } catch {
            if (!silent) {
                toast.error('Failed to load users');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    // Fetch Stats
    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin/users/stats');
            setStats(data);
        } catch {
            // Silently fail for stats
        }
    };

    useEffect(() => {
        void fetchStats();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search, roleFilter]);

    useRealtimeRefresh(() => {
        void Promise.all([fetchUsers(true), fetchStats()]);
    });


    const toggleInternalStatus = async (user: User) => {
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        // Optimistic update
        if (data) {
            setData({
                ...data,
                data: data.data.map(u => u.id === user.id ? { ...u, status: newStatus } : u)
            });
        }
        
        try {
            await api.put(`/admin/users/${user.id}`, { status: newStatus });
            toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);
            void fetchStats(); // Update stats
        } catch {
            void fetchUsers(); // Revert on error
            toast.error('Failed to update status');
        }
    };
    
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-blue-100 text-blue-700',
            'bg-emerald-100 text-emerald-700', 
            'bg-purple-100 text-purple-700',
            'bg-amber-100 text-amber-700',
            'bg-pink-100 text-pink-700',
            'bg-indigo-100 text-indigo-700'
        ];
        const charCode = name.charCodeAt(0);
        return colors[charCode % colors.length];
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#f5f7f8] dark:bg-[#101822] font-display">
             {/* Header */}
             <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-[#101822] border-b border-slate-200 dark:border-slate-800 flex-shrink-0 sticky top-0 z-30">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                        <input 
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-[#0f6df0] text-sm text-slate-900 dark:text-white placeholder:text-slate-500" 
                            placeholder="Search by name, email..." 
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
                        <span className="material-symbols-outlined text-[24px]">notifications</span>
                        <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#101822]"></span>
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-2"></div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer">
                        <div className="size-6 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-[#0f6df0]/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px] text-[#0f6df0]">face</span>
                            </div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Administrator</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Title & Filter Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and audit {stats?.total_users || '...'} registered users.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                            onClick={() => {
                                // Simple toggle filter logic for demo; could be a dropdown
                                setRoleFilter(prev => prev === 'admin' ? '' : 'admin');
                                toast(roleFilter === 'admin' ? 'Showing all users' : 'Showing admins only', { icon: '🔍' });
                            }}
                        >
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            {roleFilter === 'admin' ? 'Admins Only' : 'Filter'}
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#0f6df0] text-white rounded-lg hover:bg-[#0f6df0]/90 transition-colors text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                            Invite User
                        </button>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white dark:bg-[#101822] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Join Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading users...</td></tr>
                                )}
                                {!loading && data?.data.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
                                )}
                                {!loading && data?.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-3 ${user.status === 'suspended' ? 'opacity-60' : ''}`}>
                                                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(user.name)}`}>
                                                    {getInitials(user.name)}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold text-slate-900 dark:text-white ${user.status === 'suspended' ? 'line-through' : ''}`}>{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === 'admin' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    User
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                    <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                    <span className="size-1.5 rounded-full bg-red-500"></span>
                                                    Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-slate-400 hover:text-[#0f6df0] transition-colors" title="Edit Role">
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button 
                                                    onClick={() => toggleInternalStatus(user)}
                                                    className={`p-2 transition-colors ${user.status === 'active' ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-emerald-500'}`}
                                                    title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {user.status === 'active' ? 'block' : 'check_circle'}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                         <span className="text-sm text-slate-500">Showing <span className="text-slate-900 dark:text-white">{data?.data.length}</span> of <span className="text-slate-900 dark:text-white">{data?.meta?.total}</span> users</span>
                         <Pagination currentPage={page} lastPage={data?.meta?.last_page || 1} onPageChange={setPage} />
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white dark:bg-[#101822] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-[#0f6df0]/10 flex items-center justify-center text-[#0f6df0]">
                            <span className="material-symbols-outlined">group</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Total Users</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_users || 0}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#101822] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined">person_add</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">New This Month</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">+{stats?.new_this_month || 0}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#101822] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                            <span className="material-symbols-outlined">shield_person</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Administrators</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.admins || 0}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#101822] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                            <span className="material-symbols-outlined">person_off</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Suspended</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.suspended || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
