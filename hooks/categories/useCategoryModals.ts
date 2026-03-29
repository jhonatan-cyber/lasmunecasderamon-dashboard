'use client';

import { useState, useCallback } from 'react';

const EMPTY_FORM = { name: '', description: '' };

export function useCategoryModals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [modalValues, setModalValues] = useState(EMPTY_FORM);

  const openCreateModal = useCallback(() => {
    setModalValues(EMPTY_FORM);
    setEditCategoryId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((category: { id: string; name: string; description: string }) => {
    setModalValues({ name: category.name, description: category.description });
    setEditCategoryId(category.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalValues(EMPTY_FORM);
    setIsEditMode(false);
    setEditCategoryId(null);
  }, []);

  return {
    isModalOpen,
    setIsModalOpen,
    isEditMode,
    editCategoryId,
    modalValues,
    openCreateModal,
    openEditModal,
    closeModal
  };
}
