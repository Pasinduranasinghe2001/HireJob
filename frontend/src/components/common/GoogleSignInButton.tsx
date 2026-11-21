import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import api from '../../services/api';

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
  disableAutoSelect?: () => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const DEFAULT_GOOGLE_CLIENT_ID =
  '306552749425-8skeiqc87hn9j1k02154rpufc4td34rq.apps.googleusercontent.com';
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
    const res = await api.get('/auth/google/config', { timeout: 6000 });
    const id = (res.data?.data?.clientId as string) || DEFAULT_GOOGLE_CLIENT_ID;
    cachedClientId = id;
    return { clientId: id, reachable: true };
  } catch {
    return { clientId: DEFAULT_GOOGLE_CLIENT_ID, reachable: true };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  label?: string;
  disabled?: boolean;
}

/**
 * Always renders a clean, standard neutral "[ G  Continue with Google ]" button
 * (never pre-showing a browser Gmail address or personalized chip), while placing
 * Google Identity Services' real interactive button as an invisible click overlay on top
 * so clicking anywhere launches authentic Google Sign-In and auto-scales across screen sizes.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  text = 'continue_with',
  label = 'Continue with Google',
  disabled = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gsiContainerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const lastRenderedWidthRef = useRef<number>(0);
  const [gsiReady, setGsiReady] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  const renderGsiOverlay = useCallback(() => {
    if (!gsiContainerRef.current || !window.google?.accounts?.id) return;
    const parentWidth = wrapperRef.current?.offsetWidth || 360;
    const width = Math.min(Math.max(parentWidth, 220), 400);
    if (Math.abs(width - lastRenderedWidthRef.current) < 4) return;
    lastRenderedWidthRef.current = width;

    gsiContainerRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(gsiContainerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'pill',
      logo_alignment: 'left',
      width,
    });
  }, [text]);

  useEffect(() => {
    // Pre-warm Render backend while the user views the Login/Register page
    api.get('/auth/google/config', { timeout: 30000 }).catch(() => {});
  }, []);

  const initializeGoogleButton = useCallback(async (): Promise<'ready' | 'missing_client_id' | 'unreachable'> => {
    const { clientId, reachable } = await fetchClientId();
    if (!reachable) return 'unreachable';
    if (!clientId) return 'missing_client_id';

    await loadGsiScript();
    if (!gsiContainerRef.current || !window.google?.accounts?.id) return 'unreachable';

    window.google.accounts.id.disableAutoSelect?.();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => {
        if (res?.credential) callbackRef.current(res.credential);
      },
      auto_select: false,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      context: text === 'signup_with' ? 'signup' : 'signin',
    });

    lastRenderedWidthRef.current = 0;
    renderGsiOverlay();
    setGsiReady(true);
    return 'ready';
  }, [text, renderGsiOverlay]);

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

  useEffect(() => {
    if (!gsiReady || !wrapperRef.current) return;
    const el = wrapperRef.current;

    const handleResize = () => renderGsiOverlay();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      observer.observe(el);
    }
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [gsiReady, renderGsiOverlay]);

  const handleFallbackClick = async () => {
    if (disabled || checking) return;
    setChecking(true);
    try {
      const result = await initializeGoogleButton();
      if (result === 'ready') {
        try {
          window.google?.accounts?.id?.prompt();
        } catch {
          // User can click the freshly mounted Google button directly
        }
        return;
      }
      if (result === 'missing_client_id') {
        toast.error('Google Sign-In Client ID is not configured.');
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
    <div
      ref={wrapperRef}
      className={`relative w-full h-11 rounded-full overflow-hidden group transition-opacity ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      {/* Standard, clean neutral Google Sign-In pill UI */}
      <button
        type="button"
        onClick={gsiReady ? undefined : handleFallbackClick}
        disabled={disabled || checking}
        className="w-full h-full flex items-center justify-center gap-3 px-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-xs transition cursor-pointer disabled:opacity-60"
      >
        <FcGoogle className="w-5 h-5 shrink-0" />
        <span>{checking ? 'Connecting to Google...' : label}</span>
      </button>

      {/* Transparent click layer wrapping the authentic Google Identity Services iframe */}
      <div
        aria-hidden="true"
        className={
          gsiReady
            ? 'absolute inset-0 z-10 w-full h-full flex items-center justify-center overflow-hidden rounded-full opacity-[0.01] cursor-pointer scale-x-105 scale-y-125'
            : 'hidden'
        }
      >
        <div ref={gsiContainerRef} className="w-full h-full flex items-center justify-center" />
      </div>
    </div>
  );
};

export default GoogleSignInButton;
