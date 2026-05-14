import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/payments');
        setPayments(res.data.payments);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = payments.reduce((s, p) => s + parseFloat(p.payment_amount || 0), 0);

  return (
    <div className="flex-1 min-h-screen flex flex-col gradient-bg select-none">
      <Navbar title="Payments Ledger" />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-premium px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Payment History</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">All client settlement transactions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Collected</p>
              <p className="text-base font-extrabold text-emerald-600">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
              {payments.length} transactions
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl shadow-premium p-14 text-center space-y-3 max-w-sm mx-auto">
            <div className="text-4xl">💳</div>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">No payments recorded</h4>
              <p className="text-[12px] text-slate-400 mt-1">Settle invoice balances to see receipts here.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Receipt ID</th>
                  <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Invoice</th>
                  <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                  <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center">Date & Time</th>
                  <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-medium text-slate-400">#REC-{String(p.id).padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-[12px] font-bold text-indigo-600">{p.invoice_number}</td>
                    <td className="px-6 py-4 text-[12px] font-medium text-slate-700">{p.client_name}</td>
                    <td className="px-6 py-4 text-center text-[11px] text-slate-400 font-medium">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(p.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right text-[13px] font-extrabold text-emerald-600">
                      +₹{parseFloat(p.payment_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Payments;
