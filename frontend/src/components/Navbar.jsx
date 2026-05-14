import React from 'react';

const Navbar = ({ title }) => {
  return (
    <header className="h-20 glass-panel border-b border-slate-200/70 flex items-center justify-between px-8 sticky top-0 z-20 select-none">
      {/* Left: Page title */}
      <div>
        <h2 className="text-[18px] font-bold text-slate-800 tracking-tight leading-tight">{title}</h2>
        <p className="text-[12px] text-slate-400 font-semibold mt-0.5 leading-none">anraone Management Console</p>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3.5">
        {/* Live indicator */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl py-2 px-4 bg-white text-[13px] font-semibold text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
          Live
        </div>
      </div>
    </header>
  );
};

export default Navbar;
