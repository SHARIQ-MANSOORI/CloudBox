import React from 'react';
import { UploadCloud, Play, Trash2 } from 'lucide-react';

export const ResumeBanner = ({ activeSessions, onResume, onDiscard }) => {
  const sessionKeys = Object.keys(activeSessions || {});
  if (sessionKeys.length === 0) return null;

  const firstSession = activeSessions[sessionKeys[0]];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 sm:p-5 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 text-sm">
            Unfinished Upload Detected
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Looks like an upload for <strong className="text-slate-800">{firstSession.filename}</strong> didn't finish — want to pick up where you left off?
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
        <button
          onClick={() => onDiscard(sessionKeys[0])}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Discard</span>
        </button>
        <button
          onClick={() => onResume(firstSession)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Resume Upload</span>
        </button>
      </div>
    </div>
  );
};
