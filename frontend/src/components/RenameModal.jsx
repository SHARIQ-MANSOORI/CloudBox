import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { Edit3 } from 'lucide-react';

export const RenameModal = ({ isOpen, onClose, item, onRename }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setError('');
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      await onRename(item, name.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rename item.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rename ${item?.type === 'folder' ? 'Folder' : 'File'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="flex items-center space-x-3 text-sm text-slate-500 mb-2">
          <Edit3 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Enter a new name for "{item?.name}"</span>
        </div>

        <Input
          id="renameInput"
          name="name"
          label="Name"
          placeholder="New name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
