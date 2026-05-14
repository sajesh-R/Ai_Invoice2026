import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

const Invoices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Detail panel state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Email state
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // PDF re-generation state
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const fetchInvoices = async (autoSelectId = null) => {
    try {
      const response = await axios.get('/api/invoices');
      setInvoices(response.data.invoices);
      
      // Auto-select invoice if ID specified in URL or param
      const targetId = autoSelectId || searchParams.get('id');
      if (targetId) {
        const found = response.data.invoices.find(inv => inv.id === parseInt(targetId));
        if (found) {
          handleSelectInvoice(found);
        }
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchParams]);

  const handleSelectInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDetails(null);
    setDetailsLoading(true);
    setSearchParams({ id: invoice.id });
    
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}`);
      setInvoiceDetails(response.data);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      alert('Failed to load invoice details: ' + (err.response?.data?.message || err.message));
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    setEmailSending(true);
    setEmailSentSuccess(false);

    try {
      await axios.post(`/api/invoices/${selectedInvoice.id}/send`);
      setEmailSentSuccess(true);
      setTimeout(() => setEmailSentSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to dispatch email:', err);
      alert('Failed to send email: ' + (err.response?.data?.message || err.message));
    } finally {
      setEmailSending(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedInvoice) return;
    setPdfGenerating(true);

    try {
      const res = await axios.post(`/api/invoices/${selectedInvoice.id}/pdf`);
      // Update local invoice path
      const updatedUrl = res.data.pdf_path;
      setInvoiceDetails(prev => ({
        ...prev,
        invoice: { ...prev.invoice, pdf_path: updatedUrl }
      }));
      // Update in master list
      setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? { ...inv, pdf_path: updatedUrl } : inv));
      alert('Invoice PDF generated successfully!');
    } catch (err) {
      console.error('Failed standalone PDF generation:', err);
      alert('Failed to compile PDF: ' + (err.response?.data?.message || err.message));
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setPaymentSubmitting(true);
    try {
      const response = await axios.post('/api/payments', {
        invoice_id: selectedInvoice.id,
        payment_amount: paymentAmount
      });

      // Update local states
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      
      // Refresh list & current invoice details
      await fetchInvoices(selectedInvoice.id);
      
      alert(response.data.message || 'Payment recorded successfully!');
    } catch (err) {
      console.error('Failed to log payment:', err);
      alert('Failed to record payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Filtered invoices logic
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 min-h-screen flex flex-col gradient-bg select-none">
      <Navbar title="Invoices Ledger" />

      <main className="flex-1 p-8 grid grid-cols-1 xl:grid-cols-3 gap-8 overflow-y-auto animate-slide-up">
        
        {/* LEFT COLUMN: List & Filters (Takes 1 width column) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-premium p-6 flex flex-col h-[calc(100vh-12rem)] space-y-6">
          
          {/* Header Actions */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-base">All Invoices</h3>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search Invoice # or Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['All', 'Paid', 'Partially Paid', 'Unpaid', 'Overdue'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`text-xxs font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
                    filterStatus === status 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Scrolling Invoice Items List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No invoices match search parameters.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id;
                return (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? 'border-indigo-200 bg-indigo-50/40 shadow-glow-primary' 
                        : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-extrabold text-indigo-600">{inv.invoice_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                        inv.status === 'Partially Paid' ? 'bg-indigo-50 text-indigo-600' :
                        inv.status === 'Overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {inv.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-800 mt-2.5 truncate">{inv.client_name}</h4>
                    
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-dashed border-slate-100">
                      <span className="text-xxs text-slate-400 font-medium">
                        Due {new Date(inv.due_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        ₹{parseFloat(inv.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Detail Viewer (Takes 2 width columns) */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-premium p-8 h-[calc(100vh-12rem)] flex flex-col justify-between">
          {!selectedInvoice ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3.5">
              <span className="text-4xl">🧾</span>
              <div>
                <h4 className="font-bold text-slate-700 text-sm text-center">No Invoice Selected</h4>
                <p className="text-xs text-center mt-0.5">Select an invoice from the ledger to manage balances, download PDFs or send receipts.</p>
              </div>
            </div>
          ) : detailsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : !invoiceDetails ? (
            <div className="text-center py-12 text-xs text-red-500 font-semibold">
              Failed to load invoice details. Please refresh.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* Detailed Header & Actions Row */}
              <div className="border-b border-slate-100 pb-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-800 tracking-tight">
                        {invoiceDetails.invoice.invoice_number}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        invoiceDetails.invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                        invoiceDetails.invoice.status === 'Partially Paid' ? 'bg-indigo-50 text-indigo-600' :
                        invoiceDetails.invoice.status === 'Overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {invoiceDetails.invoice.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Issued on {new Date(invoiceDetails.invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-2">
                    {/* Log Payment Trigger */}
                    {parseFloat(invoiceDetails.invoice.balance_amount) > 0 && (
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xxs px-3 py-2 rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Log Payment
                      </button>
                    )}

                    {/* Email Dispatch Trigger */}
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSending}
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xxs px-3 py-2 rounded-xl transition-all duration-200 border border-indigo-200/40 disabled:opacity-75"
                    >
                      {emailSending ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-4a2 2 0 011.78 0l8 4A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                      )}
                      {emailSending ? 'Dispatching...' : 'Email Client'}
                    </button>

                    {/* Standalone Recompile PDF */}
                    <button
                      onClick={handleGeneratePDF}
                      disabled={pdfGenerating}
                      className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xxs px-3 py-2 rounded-xl transition-all duration-200 border border-slate-200 disabled:opacity-75"
                    >
                      {pdfGenerating ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                      Recompile PDF
                    </button>

                    {/* View/Download Current PDF */}
                    {invoiceDetails.invoice.pdf_path && (
                      <a
                        href={invoiceDetails.invoice.pdf_path}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xxs px-3.5 py-2 rounded-xl transition-all duration-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>

                {emailSentSuccess && (
                  <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 text-xs font-semibold animate-fade-in flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                    Invoice email containing PDF attachment successfully sent to {invoiceDetails.invoice.client_email}!
                  </div>
                )}
              </div>

              {/* Scrollable Details Body */}
              <div className="flex-1 overflow-y-auto space-y-8 py-5 pr-1.5">
                
                {/* Section 1: Client and Terms Metadata */}
                <div className="grid grid-cols-2 gap-8 bg-[#eef5ff]/40 rounded-3xl p-5 border border-slate-100">
                  <div className="space-y-1.5">
                    <span className="text-xxs uppercase tracking-wider text-slate-400 font-extrabold">Invoiced Client</span>
                    <p className="font-bold text-xs text-slate-800">{invoiceDetails.invoice.client_name}</p>
                    <p className="text-xxs text-indigo-600 font-semibold">{invoiceDetails.invoice.client_email}</p>
                    {invoiceDetails.invoice.client_phone && <p className="text-xxs text-slate-500">{invoiceDetails.invoice.client_phone}</p>}
                    {invoiceDetails.invoice.client_address && <p className="text-xxs text-slate-400 whitespace-pre-line mt-1">{invoiceDetails.invoice.client_address}</p>}
                  </div>
                  
                  <div className="space-y-2.5 text-right sm:text-left sm:pl-12 border-l border-slate-200/60">
                    <div className="space-y-0.5">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-extrabold block">Due Date</span>
                      <span className="text-xs font-bold text-red-600">
                        {new Date(invoiceDetails.invoice.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-extrabold block">Billing Period</span>
                      <span className="text-xs font-bold text-slate-700">Immediate settlement</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Invoice Line Items */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Billing Items</h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4 text-center">Qty</th>
                          <th className="py-2.5 px-4 text-right">Rate</th>
                          <th className="py-2.5 px-4 text-center">Tax %</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetails.items.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                            <td className="py-3 px-4 font-semibold text-slate-700">{item.description}</td>
                            <td className="py-3 px-4 text-center text-slate-500 font-medium">{item.quantity}</td>
                            <td className="py-3 px-4 text-right text-slate-500 font-semibold">₹{parseFloat(item.rate).toFixed(2)}</td>
                            <td className="py-3 px-4 text-center text-slate-500 font-semibold">{parseFloat(item.gst_vat_percentage)}%</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-800">₹{parseFloat(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 3: Summary Calculations Box */}
                <div className="flex justify-end pt-2 border-t border-dashed border-slate-100">
                  <div className="w-full sm:w-1/2 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-400 font-medium">
                      <span>Subtotal (excluding tax):</span>
                      <span className="text-slate-800 font-semibold">
                        ₹{(parseFloat(invoiceDetails.invoice.total_amount) - parseFloat(invoiceDetails.invoice.gst_vat_amount)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 font-medium">
                      <span>GST / VAT Tax Amount:</span>
                      <span className="text-indigo-600 font-semibold">+₹{parseFloat(invoiceDetails.invoice.gst_vat_amount).toFixed(2)}</span>
                    </div>
                    <div className="border-b border-slate-100 my-1"></div>
                    <div className="flex justify-between text-slate-800 font-extrabold">
                      <span>Invoiced Total:</span>
                      <span className="text-slate-900 font-black">₹{parseFloat(invoiceDetails.invoice.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Total Paid Amount:</span>
                      <span>₹{parseFloat(invoiceDetails.invoice.paid_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-extrabold border-t border-slate-100 pt-2 text-sm">
                      <span>Remaining Balance:</span>
                      <span className="text-red-700 font-black">₹{parseFloat(invoiceDetails.invoice.balance_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Payments Receipt Ledger */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Receipts Ledger</h4>
                  {invoiceDetails.payments.length === 0 ? (
                    <p className="text-xxs text-slate-400 italic">No payments recorded yet for this invoice.</p>
                  ) : (
                    <div className="space-y-2">
                      {invoiceDetails.payments.map((p) => (
                        <div key={p.id} className="bg-slate-50/50 rounded-xl border border-slate-100 p-3 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-slate-700">Receipt #{p.id}</p>
                            <p className="text-xxs text-slate-400">
                              Logged on {new Date(p.payment_date).toLocaleDateString()} at {new Date(p.payment_date).toLocaleTimeString()}
                            </p>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-600">+₹{parseFloat(p.payment_amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </div>

      </main>

      {/* RETAINER PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentAmount('');
        }}
        title="Record Client Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-5">
          <div className="bg-indigo-50/40 rounded-xl p-4 border border-indigo-100 text-xs text-indigo-700 font-medium space-y-1">
            <p>Invoice # <span className="font-bold">{selectedInvoice?.invoice_number}</span></p>
            <p>Outstanding Balance: <span className="font-bold text-red-600">₹{selectedInvoice ? parseFloat(selectedInvoice.balance_amount).toFixed(2) : '0.00'}</span></p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="amount" className="text-xxs font-bold uppercase tracking-wider text-slate-400">
              Payment Amount (USD)
            </label>
            <div className="relative">
              <span className="text-sm font-bold text-slate-400 absolute left-4 top-3">₹</span>
              <input
                id="amount"
                type="number"
                step="0.01"
                required
                min="0.01"
                max={selectedInvoice ? parseFloat(selectedInvoice.balance_amount) : undefined}
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200"
              />
            </div>
            <p className="text-xxs text-slate-400 font-medium mt-1">Supports partial payments. The invoice remains open until the balance is fully cleared.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setPaymentAmount('');
              }}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs tracking-wide transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentSubmitting}
              className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/10 disabled:opacity-75 transition-all"
            >
              {paymentSubmitting ? 'Recording...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Invoices;
