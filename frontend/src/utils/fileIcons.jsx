import React from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  File
} from 'lucide-react';

export const getFileIcon = (mimeType = '', filename = '') => {
  const mime = mimeType.toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <FileImage className="w-5 h-5 text-emerald-500" />;
  }

  if (mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return <FileVideo className="w-5 h-5 text-purple-500" />;
  }

  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <FileAudio className="w-5 h-5 text-rose-500" />;
  }

  if (
    mime.includes('javascript') ||
    mime.includes('json') ||
    mime.includes('html') ||
    mime.includes('css') ||
    ['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'c', 'cpp'].includes(ext)
  ) {
    return <FileCode className="w-5 h-5 text-amber-500" />;
  }

  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ['csv', 'xls', 'xlsx'].includes(ext)
  ) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }

  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar') ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
  ) {
    return <FileArchive className="w-5 h-5 text-indigo-500" />;
  }

  if (mime.includes('pdf') || ext === 'pdf' || mime.includes('document') || ['doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }

  return <File className="w-5 h-5 text-slate-400" />;
};
