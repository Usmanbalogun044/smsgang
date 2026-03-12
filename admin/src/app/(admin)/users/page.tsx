'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { User, PaginatedResponse } from '@/lib/types';
import Pagination from '@/components/Pagination';

export default function UsersPage() {
    const [data, setData] = useState<PaginatedResponse<User> | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, search]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/users', { 
                params: { page, search } 
            });
            setData(data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* High Fidelity Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary rotate-3">
                        <span className="material-symbols-outlined !text-2xl font-bold">group</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">User Management</h1>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Manage {data?.meta?.total || 0} registered users</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-lg">search</span>
                        <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-72 focus:ring-2 focus:ring-primary/20 text-slate-600 dark:text-slate-300 placeholder:text-slate-400 transition-all font-medium"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                        <span className="material-symbols-outlined !text-lg">person_add</span>
                        New User
                    </button>
                </div>
            </div>

            <div className="p-8">
                {/* Table Container */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Balance</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && !data ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <div className="flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                                        </td>
                                    </tr>
                                ) : data?.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</span>
                                                    <span className="text-xs text-slate-400">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                                                user.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{user.balance?.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors flex items-center justify-center">
                                                    <span className="material-symbols-outlined !text-lg">edit</span>
                                                </button>
                                                <button className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                                    <span className="material-symbols-outlined !text-lg">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && data?.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 italic">No users found matching your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data && (
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10">
                            <Pagination 
                                currentPage={data.meta.current_page} 
                                lastPage={data.meta.last_page} 
                                onPageChange={setPage} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
