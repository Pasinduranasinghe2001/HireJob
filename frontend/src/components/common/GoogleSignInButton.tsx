import React, { useEffect, useRef, useState } from 'react';
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
      }, 6000);
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

async function fetchClientId(): Promise<string> {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (envId) return envId;
  if (cachedClientId !== null) return cachedClientId;
  try {
    const res = await api.get('/auth/google/config', { timeout: 6000 });
    const id = (res.data?.data?.clientId as string) || '';
    if (id) cachedClientId = id;
    return id;
  } catch {
    return '';
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
 * Google's official Identity Services button mounts directly inside so users can pick
 * any Gmail account signed into their browser.
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
  const [hasClientId, setHasClientId] = useState<boolean | null>(null);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const clientId = await fetchClientId();
      if (cancelled) return;
      if (!clientId) {
        setHasClientId(false);
        setGsiReady(false);
        return;
      }
      setHasClientId(true);
      try {
        await loadGsiScript();
        if (cancelled || !gsiContainerRef.current || !window.google?.accounts?.id) return;

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
      } catch {
        if (!cancelled) setGsiReady(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [theme, text]);

  const handleFallbackClick = () => {
    if (disabled) return;
    if (hasClientId === false) {
      toast.error('Google Sign-In requires GOOGLE_CLIENT_ID in Render Environment settings.');
    } else {
      toast('Connecting to Google Sign-In... Please wait a moment or use Email/Password.', { icon: 'ℹ️' });
    }
  };

  return (
    <div className={`w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Official Google GIS button mounts here once GOOGLE_CLIENT_ID + Google script load */}
      <div
        ref={gsiContainerRef}
        className={gsiReady ? 'w-full flex justify-center min-h-[44px]' : 'hidden'}
      />

      {/* Always-visible clean Google pill button shown immediately / when GOOGLE_CLIENT_ID is pending */}
      {!gsiReady && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={disabled}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-xs transition cursor-pointer"
        >
          <FcGoogle className="w-5 h-5 shrink-0" />
          <span>{label}</span>
        </button>
      )}
    </div>
  );
};

export default GoogleSignInButton;
