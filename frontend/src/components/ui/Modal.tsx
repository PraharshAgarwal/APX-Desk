'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@/components/ui/Icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Universal modal — renders in a portal at body root.
 * Box is scrollable when content is tall; header + footer stay fixed.
 * Closes on backdrop click or Escape key.
 */
export default function Modal({ title, onClose, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const content = (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`modal-box modal-${size}`} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close"><IconX size={11} strokeWidth={1.8} /></button>
        </div>

        {/* Scrollable body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Portal to body so it's never clipped by parent overflow
  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}
