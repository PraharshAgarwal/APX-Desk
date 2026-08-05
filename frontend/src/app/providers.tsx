'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import OfflineBanner from '@/components/ui/OfflineBanner';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error: any) => {
          // Never retry auth or not-found errors
          if ([401, 403, 404].includes(error?.response?.status)) return false;
          // Retry network failures and 5xx up to 3 times
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000), // exponential back-off: 1s, 2s, 4s …
        refetchOnWindowFocus: true,    // re-fetch stale data when user returns to tab
        refetchOnReconnect: 'always',  // always re-fetch when coming back online
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client
    return makeQueryClient();
  }
  // Browser: reuse the same client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <OfflineBanner />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

