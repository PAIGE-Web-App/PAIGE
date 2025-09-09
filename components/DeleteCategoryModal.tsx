import React from 'react';
import { Trash2 } from 'lucide-react';
import type { BudgetCategory } from '@/types/budget';
import ConfirmationModal from './ConfirmationModal';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BudgetCategory | null;
  onDelete: (categoryId: string) => void;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onDelete,
}) => {
  const handleDelete = () => {
    if (!category) return;
    onDelete(category.id!);
  };

  if (!category) return null;

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete Category"
      message={`Are you sure you want to delete "${category.name}"?`}
      warningMessage="This action cannot be undone. All budget items in this category will also be deleted."
      confirmButtonText="Delete Category"
      confirmButtonIcon={<Trash2 className="w-4 h-4" />}
      confirmButtonVariant="danger"
    />
  );
};

export default DeleteCategoryModal; 