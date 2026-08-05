'use client';

import { useEffect, useState } from 'react';

/**
 * Detects online/offline status using the browser's navigator.onLine API
 * and shows a non-intrusive banner when the user loses connectivity.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Read initial state
    setIsOnline(navigator.onLine);

    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowRestored(false);
    };

    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowRestored(true);
        // Auto-hide the "restored" banner after 3s
        setTimeout(() => setShowRestored(false), 3000);
      }
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [wasOffline]);

  if (isOnline && !showRestored) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.25s ease',
        ...(isOnline
          ? { background: '#059669', color: '#fff' }
          : { background: '#1f2937', color: '#fff' }
        ),
      }}
    >
      {isOnline ? (
        <>
          <span style={{ fontSize: 16 }}>✓</span>
          Connection restored
        </>
      ) : (
        <>
          <span style={{ fontSize: 16 }}>⚠</span>
          You're offline — changes may not save
        </>
      )}
    </div>
  );
}
