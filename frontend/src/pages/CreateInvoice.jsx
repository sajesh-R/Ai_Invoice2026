import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

const CreateInvoice = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientsLoading, setClientsLoading] = useState(true);

  // AI Invoice states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSubmitting, setAiSubmitting] = useState(false);

  // Quick Client creation state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [clientSubmitting, setClientSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async (selectNewId = null) => {
    setClientsLoading(true);
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data.clients);
      if (response.data.clients.length > 0 && !selectedClientId) {
        setSelectedClientId(selectNewId || response.data.clients[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.email) return;

    setClientSubmitting(true);
    try {
      const res = await axios.post('/api/clients', clientForm);
      setIsClientModalOpen(false);
      setClientForm({ name: '', email: '', phone: '', address: '' });

      // Refresh client options and auto-select this newly created client
      await fetchClients(res.data.client.id.toString());
      alert('Client successfully added to directory!');
    } catch (err) {
      console.error('Failed to register client:', err);
      alert('Failed to register client: ' + (err.response?.data?.message || err.message));
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleSubmitAIInvoice = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Please select or register an invoice client first.');
      return;
    }
    if (!aiPrompt.trim()) {
      alert('Please enter a description or requirement prompt for AI compilation.');
      return;
    }

    setAiSubmitting(true);
    try {
      const response = await axios.post('/api/invoices/ai', {
        client_id: parseInt(selectedClientId),
        prompt: aiPrompt
      });

      alert('AI Invoice compiled and generated successfully!');
      navigate(`/invoices?id=${response.data.invoice.id}`);
    } catch (err) {
      console.error('Failed to generate AI invoice:', err);
      alert('Failed to generate AI invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setAiSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col gradient-bg select-none">
      <Navbar title="✨ AI Invoice Generator" />

      <main className="flex-1 p-8 overflow-y-auto max-w-2xl mx-auto w-full animate-slide-up">

        <form onSubmit={handleSubmitAIInvoice} className="bg-white rounded-3xl border border-slate-100/85 shadow-premium p-8 space-y-8">

          <div className="flex items-center gap-3.5 bg-[#eef5ff] p-5 rounded-3xl border border-slate-100/30">
            <div className="p-3 rounded-xl bg-white text-indigo-600 shadow-sm">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">AI-Powered Invoicing Draft</h4>
              <p className="text-xxs text-slate-500 mt-1 leading-relaxed">
                Describe what you're billing your client in plain language. Our AI analyzer automatically generates line items, suggests prices/hours, applies tax calculations, and builds the PDF instantly!
              </p>
            </div>
          </div>

          {/* Client Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="clientSelectAI" className="text-xxs font-bold uppercase tracking-wider text-slate-800">
                Target Billing Client
              </label>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="text-xxs font-bold text-indigo-600 hover:underline"
              >
                + Add New Client
              </button>
            </div>

            {clientsLoading ? (
              <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl animate-pulse"></div>
            ) : (
              <select
                id="clientSelectAI"
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200 bg-white"
              >
                {clients.length === 0 ? (
                  <option value="">No clients configured yet...</option>
                ) : (
                  clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Prompt Textarea */}
          <div className="space-y-1.5">
            <label htmlFor="aiPrompt" className="text-xxs font-bold uppercase tracking-wider text-slate-800">
              Explain Client Requirements / Deliverables
            </label>
            <textarea
              id="aiPrompt"
              required
              rows="6"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Design consulting services for 12 hours at ₹150 per hour. Also include a brand design kit for a flat rate of ₹1800. Please set a 12% tax rate and make the invoice due in 30 days."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200 resize-none bg-slate-50/20"
            />
          </div>

          <div className="border-t border-slate-100 my-6"></div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={aiSubmitting}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl text-white font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-75 shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform tracking-wide uppercase transition-all duration-200 active:scale-95"
            >
              {aiSubmitting ? 'AI Compiling Draft...' : '✨ Compile Invoice with AI'}
            </button>
          </div>
        </form>
      </main>

      {/* QUICK CLIENT REGISTRATION MODAL */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Add Client to Directory"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="cliName" className="text-xxs font-bold uppercase tracking-wider text-slate-800">
              Client / Company Name *
            </label>
            <input
              id="cliName"
              type="text"
              required
              placeholder="e.g. Stark Enterprises"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cliEmail" className="text-xxs font-bold uppercase tracking-wider text-slate-800">
              Billing Email *
            </label>
            <input
              id="cliEmail"
              type="email"
              required
              placeholder="e.g. pepper.potts@stark.com"
              value={clientForm.email}
              onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cliPhone" className="text-xxs font-bold uppercase tracking-wider text-slate-800">
              Phone Number
            </label>
            <input
              id="cliPhone"
              type="text"
              placeholder="+1 (555) 000-0000"
              value={clientForm.phone}
              onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cliAddress" className="text-xxs font-bold uppercase tracking-wider text-slate-800">
              Physical Billing Address
            </label>
            <textarea
              id="cliAddress"
              rows="3"
              placeholder="10880 Malibu Point, Malibu, CA"
              value={clientForm.address}
              onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsClientModalOpen(false)}
              className="w-1/2 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={clientSubmitting}
              className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all disabled:opacity-75"
            >
              {clientSubmitting ? 'Registering...' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default CreateInvoice;
