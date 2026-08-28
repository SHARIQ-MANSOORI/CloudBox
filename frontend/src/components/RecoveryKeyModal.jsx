import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Key, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react';

export const RecoveryKeyModal = ({ isOpen, onClose, recoveryKey, onConfirm }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleProceed = () => {
    if (hasConfirmed) {
      if (onConfirm) onConfirm();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Your Personal Safety Net" showCloseButton={false}>
      <div className="space-y-5 animate-fade-in">
        {/* Header Icon & Intro */}
        <div className="flex items-start space-x-3.5 bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">
              Zero-Knowledge End-to-End Encryption Activated
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              CloudBox protects your files so only you and people you explicitly share with can read them.
              Because we don't store your password or master key, this recovery key is your <strong>only escape hatch</strong> if you ever forget your password.
            </p>
          </div>
        </div>

        {/* Recovery Key Display Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Your Personal Recovery Key
          </label>
          <div className="flex items-center space-x-2 bg-slate-900 text-emerald-400 p-3.5 rounded-2xl font-mono text-base font-bold tracking-wider select-all justify-between border border-slate-800 shadow-inner">
            <div className="flex items-center space-x-2.5 truncate">
              <Key className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">{recoveryKey}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center space-x-1 text-xs font-sans font-semibold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl transition-colors border border-slate-700 shrink-0"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Safety Warning */}
        <div className="flex items-start space-x-2.5 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Save this key now:</strong> Store it in a password manager or secure location. CloudBox servers never see this key and cannot reset or recover it for you.
          </div>
        </div>

        {/* Explicit Checkbox Confirmation */}
        <div className="pt-1">
          <label className="flex items-center space-x-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={hasConfirmed}
              onChange={(e) => setHasConfirmed(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-colors"
            />
            <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              I have saved my personal recovery key in a safe place
            </span>
          </label>
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <Button
            onClick={handleProceed}
            disabled={!hasConfirmed}
            className="w-full text-xs font-semibold py-3"
          >
            Continue to CloudBox Storage
          </Button>
        </div>
      </div>
    </Modal>
  );
};
