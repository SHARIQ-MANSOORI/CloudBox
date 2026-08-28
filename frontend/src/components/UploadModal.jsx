import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';
import { useAuth } from '../store/AuthContext';
import { requestUploadUrl, directUploadToS3, confirmFileUpload } from '../services/api';
import { ResumableUploader, CHUNK_SIZE, removeStoredSession } from '../utils/chunkUploader';
import { generateDEK, encryptFileContent, wrapDEK } from '../utils/crypto';
import { formatFileSize } from '../utils/formatters';
import { UploadCloud, File, CheckCircle2, Pause, Play, XCircle, AlertCircle, Lock } from 'lucide-react';

export const UploadModal = ({
  isOpen,
  onClose,
  currentFolderId,
  onUploadSuccess,
  resumeSessionItem = null
}) => {
  const { userPublicKey } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | encrypting | uploading | paused | confirming | success | error
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const uploaderRef = useRef(null);

  useEffect(() => {
    if (resumeSessionItem) {
      setError('');
      setStatus('idle');
      // If prompt passed resume item, prefill info
      setTotalBytes(resumeSessionItem.totalSize || 0);
    }
  }, [resumeSessionItem]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setTotalBytes(file.size);
      setError('');
      setStatus('idle');
      setUploadedBytes(0);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setError('');
    setStatus('encrypting');
    const targetFolderId = currentFolderId === 'root' ? null : currentFolderId;

    try {
      // 1. Generate Per-File DEK & Encrypt File Content Client-Side
      const fileArrayBuffer = await selectedFile.arrayBuffer();
      const dekObj = await generateDEK();
      const { ciphertextBuffer, ivBase64 } = await encryptFileContent(fileArrayBuffer, dekObj);

      // 2. Wrap DEK with User's Public Key (RSA-OAEP)
      let wrappedKeyBase64 = null;
      if (userPublicKey) {
        wrappedKeyBase64 = await wrapDEK(dekObj, userPublicKey);
      }

      const encryptedBlob = new Blob([ciphertextBuffer], { type: 'application/octet-stream' });
      setTotalBytes(encryptedBlob.size);

      // Small File Threshold Check: < 5MB -> Single-shot presigned PUT (Phase 2 flow)
      if (encryptedBlob.size < CHUNK_SIZE) {
        setStatus('uploading');
        setUploadedBytes(0);

        const { file: dbFile, uploadUrl } = await requestUploadUrl(
          selectedFile.name,
          selectedFile.type || 'application/octet-stream',
          encryptedBlob.size,
          targetFolderId
        );

        await directUploadToS3(uploadUrl, encryptedBlob, (percent) => {
          setUploadedBytes(Math.round((percent * encryptedBlob.size) / 100));
        });

        setStatus('confirming');
        await confirmFileUpload(dbFile.id, encryptedBlob.size, wrappedKeyBase64, ivBase64);

        setStatus('success');
        setTimeout(() => {
          onUploadSuccess();
          handleClose();
        }, 1000);
        return;
      }

      // Large File: >= 5MB -> Chunked Resumable Multipart Flow (Phase 3 flow)
      setStatus('uploading');
      setUploadedBytes(0);

      const uploader = new ResumableUploader({
        file: encryptedBlob,
        originalFilename: selectedFile.name,
        folderId: targetFolderId,
        wrappedKey: wrappedKeyBase64,
        iv: ivBase64,
        onProgress: (uploaded, total) => {
          setUploadedBytes(uploaded);
          setTotalBytes(total);
        },
        onError: (errMsg) => {
          setStatus('error');
          setError(errMsg);
        },
        onSuccess: () => {
          setStatus('success');
          setTimeout(() => {
            onUploadSuccess();
            handleClose();
          }, 1000);
        }
      });

      uploaderRef.current = uploader;
      uploader.startOrResume();
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.message || err.message || 'Client-side encryption or upload failed.');
    }
  };

  const handlePause = () => {
    if (uploaderRef.current) {
      uploaderRef.current.pause();
      setStatus('paused');
    }
  };

  const handleResume = () => {
    if (uploaderRef.current) {
      uploaderRef.current.resume();
      setStatus('uploading');
      uploaderRef.current.startOrResume();
    }
  };

  const handleAbort = async () => {
    if (uploaderRef.current) {
      await uploaderRef.current.abort();
    } else if (resumeSessionItem) {
      removeStoredSession(`${resumeSessionItem.filename}_${resumeSessionItem.totalSize}_${resumeSessionItem.folderId || 'root'}`);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadedBytes(0);
    setTotalBytes(0);
    setStatus('idle');
    setError('');
    uploaderRef.current = null;
    onClose();
  };

  const progressPercent = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload File to CloudBox">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {status === 'success' ? (
          <div className="text-center py-6 space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-semibold text-slate-900">Upload Complete!</h4>
            <p className="text-xs text-slate-500">{selectedFile?.name} uploaded successfully.</p>
          </div>
        ) : (
          <>
            {/* File Drop / Selection Area */}
            <div
              onClick={() => status === 'idle' && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-blue-300 bg-blue-50/40 hover:bg-blue-50/70'
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
              } ${status !== 'idle' ? 'pointer-events-none opacity-80' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                disabled={status !== 'idle'}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <File className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm text-slate-800 max-w-[240px] truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatFileSize(selectedFile.size)} &bull;{' '}
                      {selectedFile.size >= CHUNK_SIZE ? (
                        <span className="text-blue-600 font-medium">Resumable Multipart (&ge; 5MB)</span>
                      ) : (
                        <span>Single-shot Direct (&lt; 5MB)</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : resumeSessionItem ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {resumeSessionItem.filename}
                  </div>
                  <p className="text-xs text-slate-500">
                    Select the local file <strong className="text-slate-700">"{resumeSessionItem.filename}"</strong> ({formatFileSize(resumeSessionItem.totalSize)}) to resume
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    Click to select a file from your device
                  </div>
                  <p className="text-xs text-slate-400">
                    Files 5MB+ automatically use chunked resumable upload
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress Bar & Controls */}
            {(status === 'uploading' || status === 'paused' || status === 'confirming') && (
              <div className="space-y-2.5 animate-fade-in bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
                  <span>
                    {status === 'confirming'
                      ? 'Finalizing upload...'
                      : status === 'paused'
                      ? 'Upload Paused'
                      : `${formatFileSize(uploadedBytes)} of ${formatFileSize(totalBytes)}`}
                  </span>
                  <span className="font-semibold text-blue-600">{progressPercent}%</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-200 ${
                      status === 'paused' ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Pause / Resume Controls for Large Files */}
                {selectedFile && selectedFile.size >= CHUNK_SIZE && status !== 'confirming' && (
                  <div className="flex items-center justify-between pt-1">
                    {status === 'uploading' ? (
                      <button
                        type="button"
                        onClick={handlePause}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResume}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAbort}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Upload</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={status === 'uploading' || status === 'confirming'}
                className="w-auto px-5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartUpload}
                disabled={!selectedFile || status === 'uploading' || status === 'confirming'}
                isLoading={status === 'uploading' || status === 'confirming'}
                className="w-auto px-5"
              >
                Upload File
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
