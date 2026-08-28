import React from 'react';
import { Cloud } from 'lucide-react';

export const Layout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-100 selection:text-blue-700">
      {/* Background Soft Glow Accents */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-4 transition-transform hover:scale-105 duration-200">
          <Cloud className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          CloudBox
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 font-normal">
          Your secure, effortless personal cloud storage space
        </p>
      </div>

      {/* Main Form Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 animate-fade-in">
          {(title || subtitle) && (
            <div className="mb-6 text-center sm:text-left">
              {title && <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h2>}
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="mt-12 text-center text-xs text-slate-400 z-10">
        &copy; {new Date().getFullYear()} CloudBox Inc. All rights reserved.
      </div>
    </div>
  );
};
