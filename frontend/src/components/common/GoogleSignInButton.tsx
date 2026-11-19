import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

/* Minimal typings for Google Identity Services (https://accounts.google.com/gsi/client) */
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
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;
let clientIdPromise: Promise<string> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('Failed to load Google Sign-In'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

function fetchClientId(): Promise<string> {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (envId) return Promise.resolve(envId);
  if (!clientIdPromise) {
    clientIdPromise = api
      .get('/auth/google/config')
      .then((res) => (res.data?.data?.clientId as string) || '')
      .catch(() => {
        clientIdPromise = null;
        return '';
      });
  }
  return clientIdPromise;
}

interface GoogleSignInButtonProps {
  /** Receives the Google-signed ID token. The backend verifies it. */
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
}

/**
 * Official "Continue with Google" button. Google shows the real account chooser with the
 * Gmail accounts already signed in to the user's browser.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  text = 'continue_with',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const { theme } = useTheme();
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const clientId = await fetchClientId();
        if (!clientId) {
          if (!cancelled) setStatus('unavailable');
          return;
        }
        await loadGsiScript();
        if (cancelled || !containerRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res?.credential) callbackRef.current(res.credential);
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
          context: text === 'signup_with' ? 'signup' : 'signin',
        });

        containerRef.current.innerHTML = '';
        const width = Math.min(Math.max(containerRef.current.offsetWidth || 320, 200), 400);
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width,
        });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [theme, text]);

  return (
    <div className={`w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div
        ref={containerRef}
        className={`w-full flex justify-center ${status === 'unavailable' ? 'hidden' : 'min-h-[44px]'}`}
      />
      {status === 'loading' && (
        <div className="w-full h-11 -mt-11 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
      )}
      {status === 'unavailable' && (
        <div className="py-2.5 px-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
          Google Sign-In activates once <code className="font-mono text-[11px]">GOOGLE_CLIENT_ID</code> is added on the server.
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
