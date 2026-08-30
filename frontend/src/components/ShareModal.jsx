import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';
import { useAuth } from '../store/AuthContext';
import { shareItem, getItemShares, updateShareRole, revokeShare, getPublicKeyByEmail, getFileDownloadUrl } from '../services/api';
import { importPublicKey, unwrapDEK, wrapDEK } from '../utils/crypto';
import { UserPlus, UserCheck, Trash2, Eye, Edit3, Shield, Loader2, Lock } from 'lucide-react';

export const ShareModal = ({ isOpen, onClose, item }) => {
  const { userPrivateKey } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer'); // 'viewer' | 'editor'
  const [collaborators, setCollaborators] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const itemType = item?.type === 'folder' ? 'folder' : 'file';

  const fetchShares = async () => {
    if (!item) return;
    setIsLoading(true);
    setError('');
    try {
      const shares = await getItemShares(itemType, item.id);
      setCollaborators(shares || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch collaborators.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      setEmail('');
      setRole('viewer');
      setError('');
      setSuccessMessage('');
      fetchShares();
    }
  }, [isOpen, item]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      // 1. Fetch recipient's public key by email
      const targetUser = await getPublicKeyByEmail(email.trim());
      const recipientPublicKeyObj = await importPublicKey(targetUser.publicKey);

      let wrappedKeyForUser = null;

      // 2. If sharing a file, unwrap DEK with owner's private key and re-wrap with recipient's public key
      if (itemType === 'file' && userPrivateKey) {
        const downloadMeta = await getFileDownloadUrl(item.id);
        if (downloadMeta.wrappedKey) {
          const dekObj = await unwrapDEK(downloadMeta.wrappedKey, userPrivateKey);
          wrappedKeyForUser = await wrapDEK(dekObj, recipientPublicKeyObj);
        }
      }

      // 3. Transmit share record with per-recipient wrapped key
      const res = await shareItem(itemType, item.id, email.trim(), role, wrappedKeyForUser);
      setSuccessMessage(res.message);
      setEmail('');
      fetchShares();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to share item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (shareId, newRole) => {
    setError('');
    try {
      await updateShareRole(itemType, item.id, shareId, newRole);
      fetchShares();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleRevoke = async (shareId) => {
    setError('');
    try {
      await revokeShare(itemType, item.id, shareId);
      fetchShares();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke access.');
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${item.name}"`}
    >
      <div className="space-y-5">
        {error && <Alert type="error" message={error} />}
        {successMessage && <Alert type="success" message={successMessage} />}

        {/* Invite Collaborator Form */}
        <form onSubmit={handleShare} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Invite People via Email
          </label>
          <div className="space-y-2.5">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              >
                <option value="viewer">Viewer (Can view & download)</option>
                <option value="editor">Editor (Can also upload & rename)</option>
              </select>

              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!email.trim() || isSubmitting}
                className="!w-auto px-5 py-2.5 text-xs shrink-0"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Collaborators List */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            People with access
          </h4>

          {isLoading ? (
            <div className="py-6 text-center text-slate-500 flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-xs">Loading collaborators...</span>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
              Not shared with anyone yet. Only you have access.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
              {collaborators.map((c) => (
                <div key={c.id} className="p-3.5 px-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-semibold text-xs">
                      {c.sharedWithUser?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {c.sharedWithUser?.email}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Shared {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <select
                      value={c.role}
                      onChange={(e) => handleRoleChange(c.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRevoke(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="w-auto px-5 text-xs">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
