import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const Alert = ({ type = 'info', message, className = '' }) => {
  if (!message) return null;

  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800 icon-rose-500',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 icon-emerald-500',
    info: 'bg-sky-50 border-sky-200 text-sky-800 icon-sky-500'
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mr-2.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mr-2.5" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0 mr-2.5" />
  };

  return (
    <div className={`flex items-start p-3.5 rounded-xl border text-sm animate-fade-in ${styles[type]} ${className}`}>
      {icons[type]}
      <div className="leading-snug">{message}</div>
    </div>
  );
};
