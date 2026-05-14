import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

const Recurring = () => {
  const [schedules, setSchedules] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', billing_cycle: 'Monthly', next_invoice_date: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm(prev => ({ ...prev, next_invoice_date: tomorrow.toISOString().split('T')[0] }));
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, clientRes] = await Promise.all([
        axios.get('/api/recurring'),
        axios.get('/api/clients')
      ]);
      setSchedules(schedRes.data.schedules);
      setClients(clientRes.data.clients);
      if (clientRes.data.clients.length > 0) {
        setForm(prev => ({ ...prev, client_id: clientRes.data.clients[0].id.toString() }));
      }
    } catch (err) {
      console.error('Failed to load recurring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.client_id || !form.billing_cycle || !form.next_invoice_date) return;
    setSubmitting(true);
    try {
      await axios.post('/api/recurring', {
        client_id: parseInt(form.client_id),
        billing_cycle: form.billing_cycle,
        next_invoice_date: form.next_invoice_date
      });
      setIsModalOpen(false);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setForm({ client_id: clients[0]?.id.toString() || '', billing_cycle: 'Monthly', next_invoice_date: tomorrow.toISOString().split('T')[0] });
      await fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const cycleColor = (cycle) => ({
    Weekly: 'bg-sky-50 text-sky-600 border-sky-100',
    Monthly: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    Quarterly: 'bg-violet-50 text-violet-600 border-violet-100',
    Annually: 'bg-purple-50 text-purple-600 border-purple-100',
  }[cycle] || 'bg-slate-50 text-slate-500 border-slate-100');

  return (
    <div className="flex-1 min-h-screen flex flex-col gradient-bg select-none">
      <Navbar title="Recurring Billing" />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto animate-slide-up">

        {/* Page header */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-premium px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Retainer Schedules</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated invoice cycles for recurring clients</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-[12px] px-4 py-2 rounded-lg shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Schedule
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl shadow-premium p-14 text-center space-y-4 max-w-sm mx-auto">
            <div className="text-4xl">⏰</div>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">No recurring schedules yet</h4>
              <p className="text-[12px] text-slate-400 mt-1">Automate monthly or quarterly billing for your retainer clients.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all">
              Configure First Schedule
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Schedule ID', 'Client', 'Cycle', 'Next Invoice', 'Last Run', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((ri) => (
                  <tr key={ri.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-medium text-slate-400">#SCH-{String(ri.id).padStart(3, '0')}</td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] font-semibold text-slate-800">{ri.client_name}</p>
                      <p className="text-[10px] text-indigo-500 mt-0.5">{ri.client_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cycleColor(ri.billing_cycle)}`}>
                        {ri.billing_cycle}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] font-medium text-slate-600">
                      {new Date(ri.next_invoice_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-slate-400 italic">
                      {ri.last_generated_date ? new Date(ri.last_generated_date).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-semibold uppercase tracking-wider">
                        {ri.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Setup Recurring Billing">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="rc-client" className="text-[10px] font-semibold uppercase tracking-widest text-slate-800">Select Client</label>
            <select id="rc-client" required value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="input-base bg-white">
              {clients.length === 0
                ? <option value="">No clients registered yet</option>
                : clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)
              }
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="rc-cycle" className="text-[10px] font-semibold uppercase tracking-widest text-slate-800">Billing Cycle</label>
            <select id="rc-cycle" required value={form.billing_cycle}
              onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
              className="input-base bg-white">
              <option value="Weekly">Weekly (every 7 days)</option>
              <option value="Monthly">Monthly (every month)</option>
              <option value="Quarterly">Quarterly (every 3 months)</option>
              <option value="Annually">Annually (every year)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="rc-date" className="text-[10px] font-semibold uppercase tracking-widest text-slate-800">First Invoice Date</label>
            <input id="rc-date" type="date" required value={form.next_invoice_date}
              onChange={(e) => setForm({ ...form, next_invoice_date: e.target.value })}
              className="input-base" />
          </div>

          <div className="bg-indigo-50 rounded-xl p-3.5 border border-indigo-100 text-[11px] text-indigo-700 leading-relaxed">
            <span className="font-bold text-indigo-800 uppercase text-[9px] tracking-widest block mb-1">Contract Note</span>
            By default, schedules generate a ₹1,500 retainer invoice with 18% GST. Amounts can be customised after schedule creation.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all disabled:opacity-60">
              {submitting ? 'Saving…' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Recurring;
