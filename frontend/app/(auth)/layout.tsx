import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      {/* Decorative Orbs */}
      <div className="orb-decorative orb-top"></div>
      <div className="orb-decorative orb-bottom"></div>

      {/* Auth Content Container */}
      <div className="auth-card">
        {/* Top Blue Accent Border */}
        <div className="accent-bar"></div>
        
        {/* Inner page content */}
        {children}
      </div>
    </div>
  );
}

