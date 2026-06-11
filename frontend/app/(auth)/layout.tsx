import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] -z-10 animate-pulse delay-1000"></div>

      {/* Auth Content Container */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl p-8 relative overflow-hidden transition-all duration-300 hover:border-slate-700/50">
        {/* Top Animated Accent Border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 animate-gradient"></div>
        
        {/* Inner page content */}
        {children}
      </div>
    </div>
  );
}
