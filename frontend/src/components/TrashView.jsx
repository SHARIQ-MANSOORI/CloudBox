import React, { useState, useEffect } from 'react';
import { getUserTrash, restoreTrashItem, permanentlyPurgeTrashItem } from '../services/api';
import { formatFileSize, formatDate } from '../utils/formatters';
import { getFileIcon } from '../utils/fileIcons';
import { Alert } from './Alert';
import { Button } from './Button';
import { Modal } from './Modal';
import { Trash2, RotateCcw, Folder, AlertTriangle, Inbox, Clock, Loader2 } from 'lucide-react';

export const TrashView = () => {
  const [trashData, setTrashData] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [purgeTarget, setPurgeTarget] = useState(null); // { type, id, name }
  const [isPurging, setIsPurging] = useState(false);

  const fetchTrash = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getUserTrash();
      setTrashData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Trash contents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (type, id, name) => {
    setError('');
    setToastMessage('');
    try {
      await restoreTrashItem(type, id);
      setToastMessage(`"${name}" restored to its original location.`);
      setTimeout(() => setToastMessage(''), 4000);
      fetchTrash();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to restore ${name}.`);
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTarget) return;
    setIsPurging(true);
    setError('');
    try {
      await permanentlyPurgeTrashItem(purgeTarget.type, purgeTarget.id);
      setToastMessage(`"${purgeTarget.name}" permanently deleted.`);
      setTimeout(() => setToastMessage(''), 4000);
      setPurgeTarget(null);
      fetchTrash();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to permanently delete item.');
    } finally {
      setIsPurging(false);
    }
  };

  const totalTrashItems = trashData.folders.length + trashData.files.length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && <Alert type="success" message={toastMessage} className="animate-fade-in" />}
      {error && <Alert type="error" message={error} className="mb-4" />}

      {/* Trash Header Notice */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-5 flex items-start space-x-3.5 shadow-xs">
        <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Trash & Auto-Purge Policy</h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Items in your trash are kept for <strong>30 days</strong> before being automatically purged forever. You can restore them anytime before their expiration date.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading trash items...</p>
        </div>
      ) : totalTrashItems === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center min-h-[320px] animate-fade-in">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Your Trash is empty</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            When you delete files or folders, they will appear here for 30 days before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders in Trash */}
          {trashData.folders.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Folders in Trash ({trashData.folders.length})
              </h4>
              <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                {trashData.folders.map((folder) => (
                  <div key={folder.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">
                          {folder.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                          <span>Deleted {formatDate(folder.deletedAt)}</span>
                          <span>&bull;</span>
                          <span className="text-amber-600 font-medium flex items-center">
                            <Clock className="w-3 h-3 mr-1 inline" />
                            {folder.daysRemaining} days left
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleRestore('folder', folder.id, folder.name)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => setPurgeTarget({ type: 'folder', id: folder.id, name: folder.name })}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete forever</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files in Trash */}
          {trashData.files.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Files in Trash ({trashData.files.length})
              </h4>
              <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                {trashData.files.map((file) => (
                  <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                      <div className="p-2 bg-slate-50 rounded-xl shrink-0">
                        {getFileIcon(file.mimeType, file.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                          <span>{formatFileSize(file.sizeInBytes)}</span>
                          <span>&bull;</span>
                          <span>Deleted {formatDate(file.deletedAt)}</span>
                          <span>&bull;</span>
                          <span className="text-amber-600 font-medium flex items-center">
                            <Clock className="w-3 h-3 mr-1 inline" />
                            {file.daysRemaining} days left
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleRestore('file', file.id, file.name)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => setPurgeTarget({ type: 'file', id: file.id, name: file.name })}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete forever</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={!!purgeTarget}
        onClose={() => setPurgeTarget(null)}
        title="Permanently Delete Item?"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3.5 bg-rose-50 p-4 rounded-2xl border border-rose-100">
            <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-rose-900 text-sm">This action cannot be undone</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Permanently deleting <strong>"{purgeTarget?.name}"</strong> will remove all its versions and S3 file data immediately.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setPurgeTarget(null)}
              disabled={isPurging}
              className="w-auto px-5 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmPurge}
              isLoading={isPurging}
              className="w-auto px-5 text-xs"
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
