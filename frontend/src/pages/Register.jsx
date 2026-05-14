import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Please fill in all three fields.'); return; }
    setSubmitting(true);
    const result = await register(name, email, password);
    setSubmitting(false);
    if (result.success) navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    else setError(result.message);
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center auth-bg px-6 py-12 select-none relative overflow-hidden">
      


      {/* Premium White & Soft Pastel Floating Liquid Bubbles */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-white blur-[100px] pointer-events-none bubble-drift-1 opacity-90"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-100/50 blur-[130px] pointer-events-none bubble-drift-2"></div>
      <div className="absolute top-[35%] left-[15%] w-[32vw] h-[32vw] rounded-full bg-slate-200/50 blur-[110px] pointer-events-none bubble-drift-3"></div>
      <div className="absolute bottom-[20%] left-[-10%] w-[25vw] h-[25vw] rounded-full bg-white blur-[95px] pointer-events-none bubble-drift-1 opacity-80"></div>

      {/* Centered Floating Premium Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[28px] p-8 md:p-10 shadow-2xl relative z-10 animate-slide-up">
        
        {/* Card Heading */}
        <div className="mb-8 text-center">
          <h2 className="text-[26px] font-bold text-slate-900 tracking-tight leading-tight">Create account</h2>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 bg-red-50 text-red-600 border border-red-200 rounded-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-shake">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Form elements matching the precise image style */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Business / Full Name input field with container */}
          <div className="w-full flex items-center bg-[#F3F4F8] border border-[#F3F4F8] focus-within:border-indigo-500/30 focus-within:ring-4 focus-within:ring-indigo-100/50 rounded-2xl px-4 py-3.5 transition-all duration-200">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <input
              id="reg-name"
              type="text"
              required
              placeholder="Business or Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 font-semibold placeholder-slate-400/80 text-[14px] ml-3"
            />
          </div>

          {/* Email input field with container */}
          <div className="w-full flex items-center bg-[#F3F4F8] border border-[#F3F4F8] focus-within:border-indigo-500/30 focus-within:ring-4 focus-within:ring-indigo-100/50 rounded-2xl px-4 py-3.5 transition-all duration-200">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              id="reg-email"
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 font-semibold placeholder-slate-400/80 text-[14px] ml-3"
            />
          </div>

          {/* Password input field with toggle */}
          <div className="w-full flex items-center bg-[#F3F4F8] border border-[#F3F4F8] focus-within:border-indigo-500/30 focus-within:ring-4 focus-within:ring-indigo-100/50 rounded-2xl px-4 py-3.5 transition-all duration-200">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 font-semibold placeholder-slate-400/80 text-[14px] ml-3"
            />
            {/* Show / Hide Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2"
              tabIndex="-1"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-2xl text-white font-extrabold text-[15px] bg-[#1A73E8] hover:bg-[#155cb0] active:bg-[#114a8f] disabled:opacity-60 shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all duration-200 mt-2 block text-center"
          >
            {submitting ? 'Creating account…' : 'Get Started Free'}
          </button>
        </form>

        {/* Center navigation links */}
        <div className="mt-6 text-center">
          <p className="text-[13px] text-slate-800 font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-extrabold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
