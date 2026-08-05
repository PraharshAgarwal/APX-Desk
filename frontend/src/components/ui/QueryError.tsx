'use client';

/**
 * QueryError — shown when a TanStack Query fetch fails.
 * Displays the error message and a manual retry button.
 *
 * Usage:
 *   const { data, isError, error, refetch } = useQuery(...);
 *   if (isError) return <QueryError error={error} onRetry={refetch} />;
 */
interface Props {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export default function QueryError({ error, onRetry, compact = false }: Props) {
  const message =
    (error as any)?.response?.data?.message ||
    (error as any)?.message ||
    'Failed to load data.';

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#dc2626', fontSize: 12 }}>
        <span>⚠ {message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        color: '#dc2626',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 28 }}>⚠</span>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Failed to load</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: 7,
            padding: '7px 18px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
