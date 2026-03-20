'use client';

import { useState } from 'react';
import { ArrowLeft, RotateCcw, Shield, Clock, Link2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface OrderInfo {
  orderId: string;
  placedDate: string;
  placedTime: string;
  serviceName: string;
  targetLink: string;
  quantity: number;
  charge: number;
  startCount: number;
  remains: number;
  progress: number;
  status: 'Pending' | 'In Progress' | 'Partial' | 'Completed' | 'Failed';
}

const MOCK_ORDER: OrderInfo = {
  orderId: '84291',
  placedDate: 'Oct 24, 2023',
  placedTime: '14:20 PM',
  serviceName: 'Instagram High Quality Followers [Non-Drop] [Real Profiles]',
  targetLink: 'instagram.com/tech_innovator',
  quantity: 1000,
  charge: 4500.0,
  startCount: 15240,
  remains: 350,
  progress: 65,
  status: 'In Progress',
};

const TIMELINE_EVENTS = [
  {
    title: 'Partial Completion',
    timestamp: 'Today, 10:45 AM',
    description: 'Order reached 650 followers successfully.',
  },
  {
    title: 'Delivery Started',
    timestamp: 'Today, 09:12 AM',
    description: 'System validated link and started processing.',
  },
  {
    title: 'Order Placed',
    timestamp: 'Oct 24, 02:20 PM',
    description: '',
  },
];

export default function OrderDetails() {
  const router = useRouter();
  const params = useParams();
  const [order] = useState<OrderInfo>(MOCK_ORDER);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'In Progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'Failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'Pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400';
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col items-center">
        <div className="w-full max-w-4xl flex-1 px-4 py-8 md:px-10">
          {/* Header Navigation */}
          <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                📋
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight dark:text-white">Order #{order.orderId}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Placed on {order.placedDate} • {order.placedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/smm/orders')} className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-200 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeft size={18} />
                Back to History
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
                <RotateCcw size={20} />
              </button>
            </div>
          </header>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details & Progress */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold dark:text-white">Delivery Progress</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(order.status)}`}>{order.status}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {order.progress}% Complete
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {Math.floor((order.progress / 100) * order.quantity)} / {order.quantity.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${order.progress}%` }}></div>
                </div>
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                  ℹ️ Updates every 5-10 minutes based on network speed.
                </p>
              </div>

              {/* Information Breakdown Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4">
                  <h2 className="text-lg font-bold dark:text-white">Service Information</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Service Name</span>
                    <span className="text-sm font-semibold text-right max-w-xs dark:text-slate-100">{order.serviceName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Target Link</span>
                    <a href={`https://${order.targetLink}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      {order.targetLink}
                      <Link2 size={14} />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity</p>
                      <p className="text-base font-bold dark:text-white">{order.quantity.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Charge</p>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">₦{order.charge.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Count</p>
                      <p className="text-base font-bold dark:text-white">{order.startCount.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remains</p>
                      <p className="text-base font-bold text-red-500">{order.remains.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Timeline & Support */}
            <div className="space-y-6">
              {/* Timeline Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                  <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                  Order Timeline
                </h2>
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {TIMELINE_EVENTS.map((event, index) => (
                    <div key={index} className="relative pl-8">
                      <div className={`absolute left-0 mt-1.5 h-5 w-5 rounded-full border-4 border-white dark:border-slate-900 ${index < 2 ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                      <p className="text-sm font-bold dark:text-white">{event.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{event.timestamp}</p>
                      {event.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{event.description}</p>}
                    </div>
                  ))}
                </div>
                <button className="mt-8 w-full rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 py-3 text-sm font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  Need Help with this Order?
                </button>
              </div>

              {/* Refill Guarantee Card */}
              <div className="rounded-xl bg-slate-900 dark:bg-slate-800 p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Shield size={18} />
                    Refill Guarantee
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">This service includes a 30-day automatic refill. If drops occur, the system will automatically top up your account.</p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 text-6xl">
                  ✓
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">© 2023 SMM Solutions. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                API Docs
              </a>
              <a href="#" className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Support Ticket
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
