'use client';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [firstName, setFirstName] = useState(() => user?.name?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(() => user?.name?.split(' ').slice(1).join(' ') ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);

  const handleProfileSave = async () => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      toast.error('Name is required.');
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await api.put('/user/profile', {
        name: fullName,
        email: email.trim(),
      });

      const updatedUser = data.user?.data ?? data.user;
      if (updatedUser) {
        useAuthStore.setState((state) => ({ user: { ...state.user, ...updatedUser } as typeof state.user }));
        const existing = localStorage.getItem('user');
        if (existing) {
          const parsed = JSON.parse(existing);
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...updatedUser }));
        }
      }

      toast.success('Profile updated successfully.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const firstError = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]?.[0]
        : null;
      toast.error(firstError || error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      toast.error('Please fill all password fields.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error('New password confirmation does not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/user/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirm,
      });

      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      toast.success('Password updated successfully.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const firstError = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]?.[0]
        : null;
      toast.error(firstError || error.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8] text-slate-900">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden mr-1 p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="material-symbols-outlined text-[#0f6df0]">settings</span>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Settings</h2>
          </div>
        </header>

        <div className="p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-10">
            <h2 className="text-3xl font-black tracking-tight">User Profile & Support</h2>
            <p className="mt-2 text-slate-500">Manage your account details, security preferences, and get help quickly.</p>
          </header>

          <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
              <span className="material-symbols-outlined text-[#0f6df0]">badge</span>
              <h3 className="text-lg font-bold">Personal Information</h3>
            </div>
            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20"
                  />
                </div>
              </div>
              <button
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="rounded-lg bg-[#0f6df0] px-6 py-2.5 font-semibold text-white transition hover:bg-[#0d5fce]"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
              <p className="mt-3 text-xs text-slate-500">Signed in as: <span className="font-semibold">{displayName || user?.name || 'Unnamed user'}</span></p>
            </div>
          </section>

          <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
              <span className="material-symbols-outlined text-[#0f6df0]">lock</span>
              <h3 className="text-lg font-bold">Account Security</h3>
            </div>
            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(event) => setNewPasswordConfirm(event.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">security</span>
                  <div>
                    <p className="text-sm font-bold">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                  </div>
                </div>
                <button className="text-sm font-bold text-[#0f6df0] hover:underline">Enable</button>
              </div>
              <button
                onClick={handlePasswordSave}
                disabled={savingPassword}
                className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
                <span className="material-symbols-outlined text-[#25D366]">on_device_training</span>
                <h3 className="text-lg font-bold">Contact Support via WhatsApp</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 32 32" className="w-9 h-9" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.66 4.83 1.81 6.85L2 30l7.37-1.79A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.45 11.45 0 0 1-5.84-1.6l-.42-.25-4.37 1.06 1.1-4.25-.28-.44A11.47 11.47 0 0 1 4.5 16C4.5 9.597 9.597 4.5 16 4.5S27.5 9.597 27.5 16 22.403 27.5 16 27.5zm6.29-8.49c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17-.23.34-.89 1.11-1.09 1.34-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.68-.57-.58-.78-.59h-.66c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.86s1.23 3.32 1.4 3.55c.17.23 2.42 3.7 5.87 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.82 2.31-1.62.29-.8.29-1.49.2-1.62-.09-.14-.32-.23-.66-.4z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-4">Need help? Chat with us directly on WhatsApp — we typically respond within minutes.</p>
                    <a
                      href="https://wa.me/8732786165"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1ebe5d] transition-colors shadow-sm"
                    >
                      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.66 4.83 1.81 6.85L2 30l7.37-1.79A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.45 11.45 0 0 1-5.84-1.6l-.42-.25-4.37 1.06 1.1-4.25-.28-.44A11.47 11.47 0 0 1 4.5 16C4.5 9.597 9.597 4.5 16 4.5S27.5 9.597 27.5 16 22.403 27.5 16 27.5zm6.29-8.49c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17-.23.34-.89 1.11-1.09 1.34-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.68-.57-.58-.78-.59h-.66c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.86s1.23 3.32 1.4 3.55c.17.23 2.42 3.7 5.87 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.82 2.31-1.62.29-.8.29-1.49.2-1.62-.09-.14-.32-.23-.66-.4z"/>
                      </svg>
                      Chat on WhatsApp
                    </a>
                    <p className="text-xs text-slate-400 mt-3">WhatsApp: <span className="font-bold text-slate-600">+8732786165</span></p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 rounded-xl border-2 border-red-100 bg-red-50/60 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="font-bold text-red-600">Delete Account</h4>
                <p className="text-sm text-slate-500">Permanently remove your account and all data. This action is irreversible.</p>
              </div>
              <button
                onClick={() => toast('Deactivate endpoint is not wired yet.', { icon: '⚠️' })}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
