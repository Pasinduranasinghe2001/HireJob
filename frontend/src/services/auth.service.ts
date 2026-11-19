import api from './api';
import type { AuthResponse, ApiResponse, LoginData, RegisterData, User } from '../types';

export interface OtpDispatchResult {
  email?: string;
  maskedEmail?: string;
  expiresInSeconds?: number;
  emailDelivered?: boolean;
  smsDelivered?: boolean;
  message?: string;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    const authData = response.data.data;
    if (authData.token) {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
    return authData;
  },

  async sendOtpLoginCode(identifier: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/otp-login/send', { identifier });
    return response.data.data;
  },

  async verifyOtpLogin(identifier: string, code: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/otp-login/verify', { identifier, code });
    const authData = response.data.data;
    if (authData.token) {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
    return authData;
  },

  async sendForgotPasswordCode(identifier: string): Promise<OtpDispatchResult> {
    const response = await api.post<ApiResponse<OtpDispatchResult>>('/auth/forgot-password/send', { identifier });
    return response.data.data;
  },

  async resetPassword(identifier: string, code: string, newPassword: string): Promise<void> {
    await api.post('/auth/forgot-password/reset', { identifier, code, newPassword });
  },

  async sendRegistrationOtp(data: RegisterData): Promise<OtpDispatchResult> {
    const response = await api.post<ApiResponse<OtpDispatchResult>>('/auth/register/send-otp', data);
    return response.data.data;
  },

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/google', { credential });
    const authData = response.data.data;
    if (authData.token) {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
    return authData;
  },

  async verifyTwoFactor(email: string, code: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-2fa', { email, code });
    const authData = response.data.data;
    if (authData.token) {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
    return authData;
  },

  async toggleTwoFactor(enabled: boolean, twoFactorType: string = 'SMS_OTP'): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/auth/toggle-2fa', { enabled, twoFactorType });
    const updatedUser = response.data.data;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  async verifyEmail(email: string, code: string): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>('/auth/verify-email', { email, code });
    return response.data.data;
  },

  async sendVerificationEmail(email: string): Promise<void> {
    await api.post(`/auth/send-verification-email?email=${encodeURIComponent(email)}`);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    const authData = response.data.data;
    if (authData.token) {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
    return authData;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/users/me');
    return response.data.data;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};
