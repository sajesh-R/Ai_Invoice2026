import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from './logo.png';

const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    name: 'Invoices',
    path: '/invoices',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    name: 'New Invoice',
    path: '/create-invoice',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    name: 'Clients',
    path: '/clients',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    name: 'Recurring Billing',
    path: '/recurring',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    name: 'Payments Ledger',
    path: '/payments',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
];

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-[240px] min-h-screen bg-[#1A73E8] flex flex-col select-none flex-shrink-0 z-30 shadow-2xl">

      {/* Logo - Matches Navbar h-20 for horizontal alignment perfection */}
      <div className="h-20 flex items-center justify-center px-6 border-b border-white/10">
        <img src={logoImg} alt="anraone" className="h-10.5 object-contain brightness-0 invert" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-xl text-[14px] font-bold transition-all duration-150 ${
                isActive
                  ? 'bg-white text-[#1A73E8] shadow-lg'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-[#1A73E8]' : 'text-white/60'}`}>
                  {/* Upgrade icons size slightly inside nav items for premium medium visual balance */}
                  {React.cloneElement(item.icon, { className: "w-[18px] h-[18px] flex-shrink-0" })}
                </span>
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Session */}
      <div className="border-t border-white/10 p-4.5">
        <div className="flex items-center gap-3 px-2.5 py-2.5 mb-1.5">
          <div className="w-9.5 h-9.5 rounded-xl bg-white/15 text-white flex items-center justify-center font-extrabold text-sm border border-white/10 flex-shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="font-bold text-white text-[13.5px] truncate leading-tight">{user?.name}</p>
            <p className="text-[11px] text-white/60 font-semibold truncate leading-tight mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
