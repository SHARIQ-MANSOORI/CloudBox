import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { getSharedWithMe } from '../services/api';
import { downloadAndDecryptFile } from '../utils/fileDownloader';
import { formatFileSize, formatDate } from '../utils/formatters';
import { getFileIcon } from '../utils/fileIcons';
import { Alert } from './Alert';
import { Folder, Users, Download, Eye, Edit3, Inbox, Clock, Loader2 } from 'lucide-react';

export const SharedWithMeView = ({ onNavigateFolder }) => {
  const { userPrivateKey } = useAuth();
  const [sharedData, setSharedData] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShared = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getSharedWithMe();
      setSharedData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shared items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, []);

  const handleDownloadFile = async (file) => {
    try {
      await downloadAndDecryptFile({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        userPrivateKey
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to decrypt shared file.');
    }
  };

  const totalSharedItems = sharedData.folders.length + sharedData.files.length;

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} className="mb-4" />}

      {/* Header Banner */}
      <div className="bg-purple-50/80 border border-purple-200/80 rounded-3xl p-5 flex items-start space-x-3.5 shadow-xs">
        <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 mt-0.5 shadow-md shadow-purple-500/20">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Shared with Me</h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Files and folders shared with you by other CloudBox users. You can view, download, or edit based on your assigned role.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading shared items...</p>
        </div>
      ) : totalSharedItems === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center min-h-[320px] animate-fade-in">
          <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-3xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nothing shared with you yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            When colleagues share files or folders with your email, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Shared Folders */}
          {sharedData.folders.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Shared Folders ({sharedData.folders.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {sharedData.folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => onNavigateFolder(folder.id)}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-100 transition-colors shrink-0">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 group-hover:text-purple-600 transition-colors truncate">
                          {folder.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Owner: {folder.ownerEmail}
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${
                      folder.role === 'editor'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {folder.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Files */}
          {sharedData.files.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Shared Files ({sharedData.files.length})
              </h4>
              <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                {sharedData.files.map((file) => (
                  <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                      <div className="p-2 bg-slate-50 rounded-xl shrink-0">
                        {getFileIcon(file.mimeType, file.name)}
                      </div>
                      <div className="min-w-0">
                        <div
                          onClick={() => handleDownloadFile(file)}
                          className="font-semibold text-sm text-slate-900 hover:text-purple-600 cursor-pointer truncate"
                        >
                          {file.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>{formatFileSize(file.sizeInBytes)}</span>
                          <span>&bull;</span>
                          <span>Owner: {file.ownerEmail}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        file.role === 'editor'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {file.role}
                      </span>

                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-1.5 rounded-xl hover:bg-purple-50 text-purple-600 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
