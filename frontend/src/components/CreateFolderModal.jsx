import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { FolderPlus } from 'lucide-react';

export const CreateFolderModal = ({ isOpen, onClose, onCreate }) => {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!folderName.trim()) {
      setError('Folder name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      await onCreate(folderName.trim());
      setFolderName('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="flex items-center space-x-3 text-sm text-slate-500 mb-2">
          <FolderPlus className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Enter a name for your new folder</span>
        </div>

        <Input
          id="folderName"
          name="folderName"
          label="Folder Name"
          placeholder="e.g. Work Documents"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          required
          autoFocus
        />

        <div className="flex items-center justify-end space-x-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="w-auto px-5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            className="w-auto px-5"
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
};
