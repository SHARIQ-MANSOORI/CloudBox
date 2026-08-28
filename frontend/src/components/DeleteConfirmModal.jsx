import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';
import { Trash2 } from 'lucide-react';

export const DeleteConfirmModal = ({ isOpen, onClose, item, onDelete }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setError('');
    setIsLoading(true);
    try {
      await onDelete(item);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move item to trash.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFolder = item?.type === 'folder';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move ${isFolder ? 'Folder' : 'File'} to Trash?`}>
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="flex items-start space-x-3.5 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="text-sm text-slate-800 leading-snug">
            Are you sure you want to move <strong className="font-semibold text-slate-900">{item?.name}</strong> to Trash?
            <p className="mt-1 text-xs text-slate-600">
              Items in trash can be restored anytime within <strong>30 days</strong> before being permanently deleted.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="w-auto px-5 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
            className="w-auto px-5 bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-amber-500/20 text-xs"
          >
            Move to Trash
          </Button>
        </div>
      </div>
    </Modal>
  );
};
