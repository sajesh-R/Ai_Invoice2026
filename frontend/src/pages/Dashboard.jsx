import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBilled: 0, totalCollected: 0,
    totalOutstanding: 0, totalOverdue: 0,
    invoiceCount: 0, overdueCount: 0
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get('/api/invoices');
        const invoices = data.invoices;
        let billed = 0, collected = 0, outstanding = 0, overdue = 0, overdueCount = 0;
        invoices.forEach(inv => {
          billed += parseFloat(inv.total_amount) || 0;
          collected += parseFloat(inv.paid_amount) || 0;
          outstanding += parseFloat(inv.balance_amount) || 0;
          if (inv.status === 'Overdue') { overdue += parseFloat(inv.balance_amount) || 0; overdueCount++; }
        });
        setStats({ totalBilled: billed, totalCollected: collected, totalOutstanding: outstanding, totalOverdue: overdue, invoiceCount: invoices.length, overdueCount });
        setRecentInvoices(invoices.slice(0, 5));
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="flex-1 min-h-screen flex flex-col">
      <Navbar title="Dashboard" />
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    </div>
  );

  const fmt = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statCards = [
    {
      label: 'Total Revenue',
      value: fmt(stats.totalBilled),
      sub: `${stats.invoiceCount} invoices generated`,
      from: 'from-blue-500', to: 'to-indigo-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    },
    {
      label: 'Collected',
      value: fmt(stats.totalCollected),
      sub: `${stats.totalBilled > 0 ? ((stats.totalCollected / stats.totalBilled) * 100).toFixed(1) : 0}% collection rate`,
      from: 'from-emerald-500', to: 'to-teal-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    },
    {
      label: 'Outstanding',
      value: fmt(stats.totalOutstanding),
      sub: 'Awaiting client settlements',
      from: 'from-amber-500', to: 'to-orange-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    },
    {
      label: 'Overdue',
      value: fmt(stats.totalOverdue),
      sub: `${stats.overdueCount} invoices past due`,
      from: 'from-rose-500', to: 'to-red-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    }
  ];

  const statusStyle = (s) => ({
    Paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Partially Paid': 'bg-blue-50 text-blue-600 border-blue-100',
    Overdue: 'bg-red-50 text-red-500 border-red-100',
    Unpaid: 'bg-amber-50 text-amber-600 border-amber-100',
  }[s] || 'bg-slate-50 text-slate-500 border-slate-100');

  return (
    <div className="flex-1 min-h-screen flex flex-col gradient-bg select-none">
      <Navbar title="Dashboard" />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto animate-slide-up">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          {statCards.map((c, i) => (
            <div key={i} className="bg-white border border-slate-100/80 rounded-[24px] p-7 shadow-premium hover-lift flex flex-col justify-between gap-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{c.label}</p>
                <div className="p-3.5 rounded-2xl bg-[#eef5ff] text-indigo-600 flex-shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{c.icon}</svg>
                </div>
              </div>
              <div>
                <p className="text-[30px] font-extrabold text-slate-900 tracking-tight leading-none">{c.value}</p>
                <p className="text-[13px] text-slate-400 font-semibold mt-2.5">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lower grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Recent Invoices */}
          <div className="bg-white border border-slate-100 rounded-[24px] shadow-premium xl:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">Recent Invoices</h3>
                <p className="text-[13px] text-slate-400 mt-1 font-semibold">Latest 5 transactions</p>
              </div>
              <Link to="/invoices" className="text-[13px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-14 space-y-2">
                  <div className="text-3xl">🧾</div>
                  <p className="text-xs font-medium text-slate-400">No invoices yet</p>
                  <Link to="/create-invoice" className="text-xs text-indigo-600 font-semibold hover:underline">Create your first invoice</Link>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[12px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="px-8 py-4 font-bold">Invoice #</th>
                      <th className="px-8 py-4 font-bold">Client</th>
                      <th className="px-8 py-4 font-bold">Due Date</th>
                      <th className="px-8 py-4 text-right font-bold">Amount</th>
                      <th className="px-8 py-4 text-center font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-8 py-5.5">
                          <Link to={`/invoices?id=${inv.id}`} className="text-[14px] font-extrabold text-indigo-600 hover:underline">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="px-8 py-5.5 text-[14px] font-semibold text-slate-700">{inv.client_name}</td>
                        <td className="px-8 py-5.5 text-[13.5px] text-slate-400 font-semibold">
                          {new Date(inv.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-5.5 text-right text-[14.5px] font-extrabold text-slate-800">
                          ₹{parseFloat(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-8 py-5.5 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusStyle(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-100 rounded-[24px] shadow-premium overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100">
              <h3 className="text-[16px] font-bold text-slate-800">Quick Actions</h3>
              <p className="text-[13px] text-slate-400 mt-1 font-semibold">Jump to common tasks</p>
            </div>
            <div className="p-6 space-y-3.5">
              {[
                { to: '/create-invoice', label: 'Create New Invoice', sub: 'Generate a PDF invoice instantly', color: 'indigo', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /> },
                { to: '/clients', label: 'Add Client', sub: 'Register a new billing client', color: 'violet', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                { to: '/recurring', label: 'Setup Recurring', sub: 'Automate monthly retainer billing', color: 'teal', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              ].map(({ to, label, sub, color, icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-4 p-4.5 rounded-2xl border border-slate-100 hover:border-${color}-100 hover:bg-${color}-50/40 transition-all group`}
                >
                  <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 flex-shrink-0`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[14px] font-bold text-slate-700 group-hover:text-${color}-600 transition-colors truncate`}>{label}</p>
                    <p className="text-[12.5px] text-slate-400 font-semibold truncate mt-1">{sub}</p>
                  </div>
                </Link>
              ))}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
