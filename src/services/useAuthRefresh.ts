/**
 * Authentication Hook
 * Provides token refresh management and session updates
 */
import { useEffect, useRef } from 'react';
import { authTokenStore } from './api';

interface UseAuthRefreshOptions {
  accessToken?: string;
  refreshToken?: string;
  onTokenRefreshed?: (tokens: { accessToken: string; refreshToken: string }) => void;
  onAuthError?: () => void;
}

/**
 * Hook to manage token refresh
 * 
 * The api.ts service already handles automatic token refresh on 401 errors,
 * but this hook provides additional functionality:
 * - Proactive token refresh before expiry
 * - Session update callback when tokens change
 * - Error handling callback
 */
export const useAuthRefresh = ({
  accessToken,
  refreshToken,
  onTokenRefreshed,
  onAuthError,
}: UseAuthRefreshOptions) => {
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return;
    }

    // Set up proactive token refresh
    // Access tokens expire in 15 minutes (900 seconds)
    // Refresh them at 12 minutes (720 seconds) to be safe
    const REFRESH_BEFORE_EXPIRY_MS = 12 * 60 * 1000; // 12 minutes

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          }
        );

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        authTokenStore.setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        onTokenRefreshed?.({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      } catch (error) {
        console.error('Proactive token refresh failed:', error);
        onAuthError?.();
      }
    }, REFRESH_BEFORE_EXPIRY_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [accessToken, refreshToken, onTokenRefreshed, onAuthError]);
};
