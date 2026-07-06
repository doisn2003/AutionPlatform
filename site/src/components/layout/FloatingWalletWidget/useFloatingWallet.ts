import { useState, useEffect, useCallback } from 'react';

export const useFloatingWallet = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeWallet = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeWallet();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeWallet]);

  return {
    isOpen,
    toggleOpen,
    closeWallet,
  };
};
