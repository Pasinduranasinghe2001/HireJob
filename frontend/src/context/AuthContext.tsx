import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User, LoginData, RegisterData, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginData) => Promise<AuthResponse>;
  verifyOtpLogin: (identifier: string, code: string) => Promise<AuthResponse>;
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  verifyTwoFactor: (email: string, code: string) => Promise<AuthResponse>;
  toggleTwoFactor: (enabled: boolean, twoFactorType?: string) => Promise<User>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  sendVerificationEmail: (email: string) => Promise<void>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [loading, setLoading] = useState<boolean>(() => {
    const t = authService.getToken();
    const u = authService.getStoredUser();
    return !!t && !u;
  });

  useEffect(() => {
    let ignore = false;
    const initAuth = async () => {
      const storedToken = authService.getToken();
      if (!storedToken) {
        if (!ignore) setLoading(false);
        return;
      }
      try {
        const currentUser = await authService.getCurrentUser();
        if (!ignore && currentUser) {
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (!ignore && (status === 401 || status === 403)) {
          authService.logout();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    initAuth();
    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(async (data: LoginData): Promise<AuthResponse> => {
    const authData = await authService.login(data);
    if (authData.token) {
      setToken(authData.token);
      setUser(authData.user);
    }
    return authData;
  }, []);

  const verifyOtpLogin = useCallback(async (identifier: string, code: string): Promise<AuthResponse> => {
    const authData = await authService.verifyOtpLogin(identifier, code);
    if (authData.token) {
      setToken(authData.token);
      setUser(authData.user);
    }
    return authData;
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<AuthResponse> => {
    const authData = await authService.loginWithGoogle(credential);
    if (authData.token) {
      setToken(authData.token);
      setUser(authData.user);
    }
    return authData;
  }, []);

  const verifyTwoFactor = useCallback(async (email: string, code: string): Promise<AuthResponse> => {
    const authData = await authService.verifyTwoFactor(email, code);
    if (authData.token) {
      setToken(authData.token);
      setUser(authData.user);
    }
    return authData;
  }, []);

  const toggleTwoFactor = useCallback(async (enabled: boolean, twoFactorType: string = 'SMS_OTP'): Promise<User> => {
    const updatedUser = await authService.toggleTwoFactor(enabled, twoFactorType);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string): Promise<boolean> => {
    const res = await authService.verifyEmail(email, code);
    if (res && user) {
      const updatedUser = { ...user, emailVerified: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    return res;
  }, [user]);

  const sendVerificationEmail = useCallback(async (email: string): Promise<void> => {
    await authService.sendVerificationEmail(email);
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    const authData = await authService.register(data);
    if (authData.token) {
      setToken(authData.token);
      setUser(authData.user);
    }
    return authData;
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        verifyOtpLogin,
        loginWithGoogle,
        verifyTwoFactor,
        toggleTwoFactor,
        verifyEmail,
        sendVerificationEmail,
        register,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
