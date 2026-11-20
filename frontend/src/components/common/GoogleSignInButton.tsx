import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface GoogleCredentialResponse {
  credential: string;
}
interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (res: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  prompt: () => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;
let cachedClientId: string | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      const timer = setTimeout(() => {
        scriptPromise = null;
        reject(new Error('Google script timed out'));
      }, 10000);
      s.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      s.onerror = () => {
        clearTimeout(timer);
        scriptPromise = null;
        reject(new Error('Failed to load Google Sign-In'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

async function fetchClientId(): Promise<{ clientId: string; reachable: boolean }> {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (envId) return { clientId: envId, reachable: true };
  if (cachedClientId) return { clientId: cachedClientId, reachable: true };
  try {
    // Allow up to 35s in case Render Free tier is waking up from sleep
    const res = await api.get('/auth/google/config', { timeout: 35000 });
    const id = (res.data?.data?.clientId as string) || '';
    if (id) cachedClientId = id;
    return { clientId: id, reachable: true };
  } catch {
    return { clientId: '', reachable: false };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  label?: string;
  disabled?: boolean;
}

/**
 * Always displays a clean Google Sign-In pill button immediately.
 * When GOOGLE_CLIENT_ID is configured on the server (or VITE_GOOGLE_CLIENT_ID),
 * mounts Google's official button so users see Google's browser Gmail account chooser.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  text = 'continue_with',
  label = 'Continue with Google',
  disabled = false,
}) => {
  const gsiContainerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const { theme } = useTheme();
  const [gsiReady, setGsiReady] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  const initializeGoogleButton = useCallback(async (): Promise<'ready' | 'missing_client_id' | 'unreachable'> => {
    const { clientId, reachable } = await fetchClientId();
    if (!reachable) return 'unreachable';
    if (!clientId) return 'missing_client_id';

    await loadGsiScript();
    if (!gsiContainerRef.current || !window.google?.accounts?.id) return 'unreachable';

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => {
        if (res?.credential) callbackRef.current(res.credential);
      },
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      context: text === 'signup_with' ? 'signup' : 'signin',
    });

    gsiContainerRef.current.innerHTML = '';
    const width = Math.min(Math.max(gsiContainerRef.current.offsetWidth || 320, 220), 400);
    window.google.accounts.id.renderButton(gsiContainerRef.current, {
      type: 'standard',
      theme: theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      text,
      shape: 'pill',
      logo_alignment: 'left',
      width,
    });
    setGsiReady(true);
    return 'ready';
  }, [theme, text]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await initializeGoogleButton();
        if (cancelled) return;
        if (res !== 'ready') setGsiReady(false);
      } catch {
        if (!cancelled) setGsiReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initializeGoogleButton]);

  const handleFallbackClick = async () => {
    if (disabled || checking) return;
    setChecking(true);
    try {
      const result = await initializeGoogleButton();
      if (result === 'ready') {
        try {
          window.google?.accounts?.id?.prompt();
        } catch {
          // User can click the freshly mounted official Google button directly
        }
        return;
      }
      if (result === 'missing_client_id') {
        toast.error(
          'Add your Google OAuth Client ID (GOOGLE_CLIENT_ID) to Render Environment so Google shows your browser Gmail accounts.'
        );
      } else {
        toast.error('Server is still waking up. Please wait a few seconds and click again.');
      }
    } catch {
      toast.error('Could not reach Google Sign-In. Please check your connection and try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={`w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div
        ref={gsiContainerRef}
        className={gsiReady ? 'w-full flex justify-center min-h-[44px]' : 'hidden'}
      />

      {!gsiReady && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={disabled || checking}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-xs transition cursor-pointer disabled:opacity-60"
        >
          <FcGoogle className="w-5 h-5 shrink-0" />
          <span>{checking ? 'Connecting to Google...' : label}</span>
        </button>
      )}
    </div>
  );
};

export default GoogleSignInButton;
