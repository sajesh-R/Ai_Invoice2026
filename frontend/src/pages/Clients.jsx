import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data.clients);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSubmitting(true);
    try {
      await axios.post('/api/clients', form);
      setIsModalOpen(false);
      setForm({ name: '', email: '', phone: '', address: '' });
      await fetchClients();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col gradient-bg select-none">
      <Navbar title="Client Directory" />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto animate-slide-up">

        {/* Page header */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-premium px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Client Accounts</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Manage billing contacts for your invoices</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-[12px] px-4 py-2 rounded-lg shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Client
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl shadow-premium p-14 text-center space-y-4 max-w-sm mx-auto">
            <div className="text-4xl">👥</div>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">No clients yet</h4>
              <p className="text-[12px] text-slate-400 mt-1">Add your first client to start generating invoices.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all">
              Add First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((c) => (
              <div key={c.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-premium hover-lift flex flex-col gap-4">
                {/* Client header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#eef5ff] text-indigo-600 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-semibold text-slate-800 text-[13px] truncate">{c.name}</p>
                    <p className="text-[11px] text-indigo-500 font-medium truncate">{c.email}</p>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-2">{c.address}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-medium">
                  Registered {new Date(c.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Client">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: 'cn', label: 'Client / Company Name *', type: 'text', field: 'name', placeholder: 'e.g. Acme Corp' },
            { id: 'ce', label: 'Billing Email *', type: 'email', field: 'email', placeholder: 'billing@acme.com' },
            { id: 'cp', label: 'Phone Number', type: 'text', field: 'phone', placeholder: '+91 98765 43210' },
          ].map(({ id, label, type, field, placeholder }) => (
            <div key={id} className="space-y-1">
              <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-widest text-slate-800">{label}</label>
              <input id={id} type={type} placeholder={placeholder} required={label.includes('*')}
                value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="input-base" />
            </div>
          ))}
          <div className="space-y-1">
            <label htmlFor="ca" className="text-[10px] font-semibold uppercase tracking-widest text-slate-800">Billing Address</label>
            <textarea id="ca" rows="3" placeholder="123 Business Street, Mumbai, MH"
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-base resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all disabled:opacity-60">
              {submitting ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;
