import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import {
  getFolderContents,
  createFolder,
  renameFolder,
  deleteFolder,
  getFileDownloadUrl,
  renameFile,
  deleteFile
} from '../services/api';
import { downloadAndDecryptFile } from '../utils/fileDownloader';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { RenameModal } from '../components/RenameModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { UploadModal } from '../components/UploadModal';
import { ResumeBanner } from '../components/ResumeBanner';
import { TrashView } from '../components/TrashView';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { ShareModal } from '../components/ShareModal';
import { SharedWithMeView } from '../components/SharedWithMeView';
import { RecoveryKeyModal } from '../components/RecoveryKeyModal';
import { AccountSettingsModal } from '../components/AccountSettingsModal';
import { getStoredSessions, removeStoredSession } from '../utils/chunkUploader';
import { getFileIcon } from '../utils/fileIcons';
import { formatFileSize, formatDate } from '../utils/formatters';
import {
  Cloud,
  LogOut,
  Folder,
  FolderPlus,
  Upload,
  Download,
  MoreVertical,
  ChevronRight,
  Home,
  Grid,
  List,
  Edit3,
  Trash2,
  Inbox,
  Loader2,
  HardDrive,
  History,
  Users,
  Share2,
  UserCheck,
  ShieldCheck,
  Lock
} from 'lucide-react';

export const DashboardPage = () => {
  const { user, logout, userPrivateKey, pendingRecoveryKey, clearPendingRecoveryKey } = useAuth();

  // Primary Navigation State
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'shared' | 'trash'
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [contents, setContents] = useState({
    folder: null,
    parentFolderId: null,
    breadcrumbs: [{ id: 'root', name: 'Home' }],
    folders: [],
    files: [],
    userRole: 'owner'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Interrupted Upload State
  const [activeSessions, setActiveSessions] = useState({});
  const [resumeSessionTarget, setResumeSessionTarget] = useState(null);

  // Modal States
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { id, name, type: 'folder'|'file' }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, type: 'folder'|'file' }
  const [versionFileTarget, setVersionFileTarget] = useState(null); // file object
  const [shareTarget, setShareTarget] = useState(null); // { id, name, type: 'folder'|'file' }
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    setActiveSessions(getStoredSessions());
  }, []);

  const handleDiscardSession = (fingerprint) => {
    removeStoredSession(fingerprint);
    setActiveSessions(getStoredSessions());
  };

  const handleResumeSession = (sessionItem) => {
    setResumeSessionTarget(sessionItem);
    setIsUploadOpen(true);
  };

  // Fetch Contents
  const fetchContents = useCallback(async (folderId) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getFolderContents(folderId);
      setContents(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load folder contents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'files') {
      fetchContents(currentFolderId);
    }
  }, [currentFolderId, activeTab, fetchContents]);

  // Click outside listener for drop-down menus
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Handlers
  const handleNavigateFolder = (folderId) => {
    setActiveTab('files');
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = async (name) => {
    const parentId = currentFolderId === 'root' ? null : currentFolderId;
    await createFolder(name, parentId);
    fetchContents(currentFolderId);
  };

  const handleRename = async (item, newName) => {
    if (item.type === 'folder') {
      await renameFolder(item.id, newName);
    } else {
      await renameFile(item.id, newName);
    }
    fetchContents(currentFolderId);
  };

  const handleDelete = async (item) => {
    if (item.type === 'folder') {
      await deleteFolder(item.id);
    } else {
      await deleteFile(item.id);
    }
    fetchContents(currentFolderId);
  };

  const handleDownloadFile = async (file) => {
    try {
      await downloadAndDecryptFile({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        userPrivateKey
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to decrypt and download file.');
    }
  };

  const currentUserRole = contents.userRole || 'owner';
  const canWriteCurrentFolder = currentUserRole === 'owner' || currentUserRole === 'editor';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navbar Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight">CloudBox</span>
                <span className="ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Phase 6 E2E Encryption
                </span>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('files')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'files'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>My Drive</span>
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'shared'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Shared with me</span>
              </button>
              <button
                onClick={() => setActiveTab('trash')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'trash'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Trash</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAccountSettingsOpen(true)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-colors"
              title="Security & Encryption Status"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Encrypted</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-100 py-1.5 px-3 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{user?.email}</span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center bg-slate-200/80 p-1 rounded-2xl mb-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 inline-flex items-center justify-center space-x-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'files' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
            <span>Drive</span>
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`flex-1 inline-flex items-center justify-center space-x-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'shared' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Shared</span>
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`flex-1 inline-flex items-center justify-center space-x-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'trash' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Trash</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && <Alert type="error" message={error} className="mb-6" />}

        {/* Unfinished Upload Banner */}
        {activeTab === 'files' && (
          <ResumeBanner
            activeSessions={activeSessions}
            onResume={handleResumeSession}
            onDiscard={handleDiscardSession}
          />
        )}

        {/* Tab Router Content */}
        {activeTab === 'trash' ? (
          <TrashView />
        ) : activeTab === 'shared' ? (
          <SharedWithMeView onNavigateFolder={handleNavigateFolder} />
        ) : (
          /* Render My Drive Folder Browser */
          <>
            {/* Action Toolbar & Breadcrumbs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Breadcrumb Path */}
              <nav className="flex items-center space-x-1.5 overflow-x-auto py-1 text-sm font-medium text-slate-600">
                {contents.breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === contents.breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id || idx}>
                      {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
                      <button
                        onClick={() => handleNavigateFolder(crumb.id)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                          isLast
                            ? 'bg-blue-50 text-blue-700 font-semibold cursor-default'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {crumb.id === 'root' && <Home className="w-4 h-4 mr-1 text-blue-600" />}
                        <span>{crumb.name}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </nav>

              {/* Action Toolbar (Role-Aware) */}
              <div className="flex items-center space-x-3 shrink-0">
                {canWriteCurrentFolder && (
                  <>
                    <Button
                      onClick={() => setIsUploadOpen(true)}
                      className="w-auto text-xs px-4"
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      Upload File
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setIsCreateFolderOpen(true)}
                      className="w-auto text-xs px-4"
                    >
                      <FolderPlus className="w-4 h-4 mr-1.5 text-blue-600" />
                      New Folder
                    </Button>
                  </>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Explorer Area */}
            <div className="flex-1">
              {isLoading ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-slate-500">Loading contents...</p>
                </div>
              ) : contents.folders.length === 0 && contents.files.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center min-h-[360px] animate-fade-in">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">This folder is empty</h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm">
                    Upload your files or create a subfolder to get started with CloudBox storage.
                  </p>
                  {canWriteCurrentFolder && (
                    <div className="mt-6 flex items-center space-x-3">
                      <Button
                        onClick={() => setIsUploadOpen(true)}
                        className="w-auto px-5 text-xs"
                      >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Upload a File
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsCreateFolderOpen(true)}
                        className="w-auto px-5 text-xs"
                      >
                        <FolderPlus className="w-4 h-4 mr-1.5 text-blue-600" />
                        Create Folder
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Folders Section */}
                  {contents.folders.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                        Folders ({contents.folders.length})
                      </h4>

                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {contents.folders.map((folder) => {
                            const canEdit = folder.userRole === 'owner' || folder.userRole === 'editor';
                            const isOwner = folder.userRole === 'owner';

                            return (
                              <div
                                key={folder.id}
                                onClick={() => handleNavigateFolder(folder.id)}
                                className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 group cursor-pointer flex items-center justify-between relative"
                              >
                                <div className="flex items-center space-x-3 min-w-0 pr-2">
                                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors shrink-0 relative">
                                    <Folder className="w-6 h-6" />
                                    {folder.isShared && (
                                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[9px] border border-white">
                                        <Users className="w-2.5 h-2.5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-sm text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                      {folder.name}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                                      <span>{formatDate(folder.createdAt)}</span>
                                      {folder.isShared && (
                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded-full">
                                          Shared
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Context Action Button */}
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setActiveMenuId(activeMenuId === folder.id ? null : folder.id)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeMenuId === folder.id && (
                                    <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-fade-in text-xs font-medium">
                                      {isOwner && (
                                        <button
                                          onClick={() => {
                                            setShareTarget({ ...folder, type: 'folder' });
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                        >
                                          <Share2 className="w-3.5 h-3.5 mr-2 text-purple-500" /> Share...
                                        </button>
                                      )}
                                      {canEdit && (
                                        <button
                                          onClick={() => {
                                            setRenameTarget({ ...folder, type: 'folder' });
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-400" /> Rename
                                        </button>
                                      )}
                                      {isOwner && (
                                        <button
                                          onClick={() => {
                                            setDeleteTarget({ ...folder, type: 'folder' });
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-500" /> Move to Trash
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Folder List View */
                        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                          {contents.folders.map((folder) => {
                            const canEdit = folder.userRole === 'owner' || folder.userRole === 'editor';
                            const isOwner = folder.userRole === 'owner';

                            return (
                              <div
                                key={folder.id}
                                onClick={() => handleNavigateFolder(folder.id)}
                                className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className="relative">
                                    <Folder className="w-5 h-5 text-blue-500 shrink-0" />
                                  </div>
                                  <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                                    {folder.name}
                                  </span>
                                  {folder.isShared && (
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                      Shared
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-6 text-xs text-slate-400 shrink-0">
                                  <span>{formatDate(folder.createdAt)}</span>
                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setActiveMenuId(activeMenuId === folder.id ? null : folder.id)}
                                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {activeMenuId === folder.id && (
                                      <div className="absolute right-0 top-6 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 text-xs font-medium">
                                        {isOwner && (
                                          <button
                                            onClick={() => {
                                              setShareTarget({ ...folder, type: 'folder' });
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                          >
                                            <Share2 className="w-3.5 h-3.5 mr-2 text-purple-500" /> Share...
                                          </button>
                                        )}
                                        {canEdit && (
                                          <button
                                            onClick={() => {
                                              setRenameTarget({ ...folder, type: 'folder' });
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                          >
                                            <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-400" /> Rename
                                          </button>
                                        )}
                                        {isOwner && (
                                          <button
                                            onClick={() => {
                                              setDeleteTarget({ ...folder, type: 'folder' });
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-500" /> Move to Trash
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Files Section */}
                  {contents.files.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                        Files ({contents.files.length})
                      </h4>

                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {contents.files.map((file) => {
                            const canEdit = file.userRole === 'owner' || file.userRole === 'editor';
                            const isOwner = file.userRole === 'owner';

                            return (
                              <div
                                key={file.id}
                                className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3 group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0 relative">
                                    {getFileIcon(file.mimeType, file.name)}
                                    {file.isShared && (
                                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[9px] border border-white">
                                        <Users className="w-2.5 h-2.5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeMenuId === file.id && (
                                      <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 text-xs font-medium">
                                        <button
                                          onClick={() => {
                                            handleDownloadFile(file);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                        >
                                          <Download className="w-3.5 h-3.5 mr-2 text-blue-500" /> Download
                                        </button>

                                        {isOwner && (
                                          <button
                                            onClick={() => {
                                              setShareTarget({ ...file, type: 'file' });
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                          >
                                            <Share2 className="w-3.5 h-3.5 mr-2 text-purple-500" /> Share...
                                          </button>
                                        )}

                                        <button
                                          onClick={() => {
                                            setVersionFileTarget(file);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                        >
                                          <History className="w-3.5 h-3.5 mr-2 text-purple-500" /> Version History
                                        </button>

                                        {canEdit && (
                                          <button
                                            onClick={() => {
                                              setRenameTarget({ ...file, type: 'file' });
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                          >
                                            <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-400" /> Rename
                                          </button>
                                        )}

                                        {isOwner && (
                                          <button
                                            onClick={() => {
                                              setDeleteTarget({ ...file, type: 'file' });
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-500" /> Move to Trash
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div
                                    onClick={() => handleDownloadFile(file)}
                                    className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors cursor-pointer truncate"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
                                    <span>{formatFileSize(file.sizeInBytes)}</span>
                                    <span>{formatDate(file.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* File List View */
                        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                          {contents.files.map((file) => {
                            const canEdit = file.userRole === 'owner' || file.userRole === 'editor';
                            const isOwner = file.userRole === 'owner';

                            return (
                              <div
                                key={file.id}
                                className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                              >
                                <div
                                  onClick={() => handleDownloadFile(file)}
                                  className="flex items-center space-x-3 min-w-0 cursor-pointer"
                                >
                                  {getFileIcon(file.mimeType, file.name)}
                                  <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                                    {file.name}
                                  </span>
                                  {file.isShared && (
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                      Shared
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-6 text-xs text-slate-500 shrink-0">
                                  <span>{formatFileSize(file.sizeInBytes)}</span>
                                  <span className="hidden sm:inline text-slate-400">{formatDate(file.createdAt)}</span>

                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleDownloadFile(file)}
                                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                      title="Download"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>

                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                      {activeMenuId === file.id && (
                                        <div className="absolute right-0 top-6 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 text-xs font-medium">
                                          {isOwner && (
                                            <button
                                              onClick={() => {
                                                setShareTarget({ ...file, type: 'file' });
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                            >
                                              <Share2 className="w-3.5 h-3.5 mr-2 text-purple-500" /> Share...
                                            </button>
                                          )}
                                          <button
                                            onClick={() => {
                                              setVersionFileTarget(file);
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                          >
                                            <History className="w-3.5 h-3.5 mr-2 text-purple-500" /> Version History
                                          </button>
                                          {canEdit && (
                                            <button
                                              onClick={() => {
                                                setRenameTarget({ ...file, type: 'file' });
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center"
                                            >
                                              <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-400" /> Rename
                                            </button>
                                          )}
                                          {isOwner && (
                                            <button
                                              onClick={() => {
                                                setDeleteTarget({ ...file, type: 'file' });
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-500" /> Move to Trash
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Action Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setResumeSessionTarget(null);
          setActiveSessions(getStoredSessions());
        }}
        currentFolderId={currentFolderId}
        resumeSessionItem={resumeSessionTarget}
        onUploadSuccess={() => {
          fetchContents(currentFolderId);
          setActiveSessions(getStoredSessions());
        }}
      />

      <RenameModal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        item={renameTarget}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        item={deleteTarget}
        onDelete={handleDelete}
      />

      <VersionHistoryModal
        isOpen={!!versionFileTarget}
        onClose={() => setVersionFileTarget(null)}
        file={versionFileTarget}
        onVersionRestored={() => fetchContents(currentFolderId)}
      />

      <ShareModal
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
        item={shareTarget}
      />

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        user={user}
        hasPrivateKey={!!userPrivateKey}
      />

      {pendingRecoveryKey && (
        <RecoveryKeyModal
          isOpen={true}
          onClose={clearPendingRecoveryKey}
          recoveryKey={pendingRecoveryKey}
          onConfirm={clearPendingRecoveryKey}
        />
      )}
    </div>
  );
};
