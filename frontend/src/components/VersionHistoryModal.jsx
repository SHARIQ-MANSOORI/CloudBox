import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';
import { getFileVersions, restoreFileVersion } from '../services/api';
import { formatFileSize, formatDate } from '../utils/formatters';
import { History, CheckCircle2, RotateCcw, Clock, User, Loader2 } from 'lucide-react';

export const VersionHistoryModal = ({ isOpen, onClose, file, onVersionRestored }) => {
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoringId, setIsRestoringId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchVersions = async () => {
    if (!file) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getFileVersions(file.id);
      setVersions(data.versions || []);
      setCurrentVersionId(data.currentVersionId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch version history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && file) {
      setSuccessMessage('');
      fetchVersions();
    }
  }, [isOpen, file]);

  const handleRestore = async (version) => {
    if (version.isCurrent) return;
    setIsRestoringId(version.id);
    setError('');
    setSuccessMessage('');
    try {
      await restoreFileVersion(file.id, version.id);
      setSuccessMessage(`Version #${version.versionNumber} restored as current version.`);
      await fetchVersions();
      if (onVersionRestored) {
        onVersionRestored();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore version.');
    } finally {
      setIsRestoringId(null);
    }
  };

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Version History — ${file.name}`}
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}
        {successMessage && <Alert type="success" message={successMessage} />}

        {isLoading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="text-xs font-medium">Loading version history...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No version history found.
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  ver.isCurrent
                    ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    ver.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">
                        Version {ver.versionNumber}
                      </span>
                      {ver.isCurrent && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Current Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-slate-400" />
                        {formatDate(ver.createdAt)}
                      </span>
                      <span>&bull;</span>
                      <span>{formatFileSize(ver.sizeInBytes)}</span>
                      <span>&bull;</span>
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1 text-slate-400" />
                        {ver.createdBy}
                      </span>
                    </div>
                  </div>
                </div>

                {!ver.isCurrent && (
                  <button
                    onClick={() => handleRestore(ver)}
                    disabled={isRestoringId === ver.id}
                    className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-all shrink-0 shadow-2xs disabled:opacity-50"
                  >
                    {isRestoringId === ver.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>Restore version</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="w-auto px-5 text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
