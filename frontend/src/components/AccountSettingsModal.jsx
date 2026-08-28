import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ShieldCheck, Key, Lock, AlertCircle } from 'lucide-react';

export const AccountSettingsModal = ({ isOpen, onClose, user, hasPrivateKey }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Security & Encryption Settings">
      <div className="space-y-5 animate-fade-in">
        {/* Status Badge */}
        <div className="flex items-center space-x-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">Zero-Knowledge Storage Active</h4>
            <p className="text-xs text-slate-600">
              End-to-End Client Encryption (RSA-OAEP 2048-bit + AES-256-GCM)
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Account Email</span>
            <span className="font-semibold text-slate-900">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Session Key Status</span>
            <span className="inline-flex items-center font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3 mr-1" /> Unlocked in Memory
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 font-medium">Key Encryption Scheme</span>
            <span className="font-semibold text-slate-800">PBKDF2 (100,000 Iterations)</span>
          </div>
        </div>

        {/* Recovery Key Notice */}
        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold">
            <Key className="w-4 h-4 text-blue-600" />
            <span>Recovery Key Status</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Your personal recovery key was displayed when your account encryption was initialized. For zero-knowledge security, your recovery key cannot be displayed again from the server.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="w-auto px-6">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
