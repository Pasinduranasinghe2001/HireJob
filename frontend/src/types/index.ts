export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: 'ROLE_POSTER' | 'ROLE_CLIENT' | 'ROLE_ADMIN';
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorType?: string;
  createdAt: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  jobType: 'TEMPORARY' | 'PERMANENT';
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  salaryMin: number;
  salaryMax: number;
  imageUrl: string | null;
  imageUrls?: string[] | null;
  durationDays?: number | null;
  expiresAt?: string | null;
  isPriority?: boolean;
  priorityExpiresAt?: string | null;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  viewsCount?: number;
  spamScore?: number;
  isFlagged?: boolean;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  postedBy: User;
  createdAt: string;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewer: User;
  createdAt: string;
}

export interface JobApplication {
  id: number;
  jobId: number;
  jobTitle?: string;
  jobLocation?: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  applicant: User;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  userId: number;
  userFullName: string;
  jobId: number;
  jobTitle: string;
  amount: number;
  packageType: string;
  paymentMethod: string;
  transactionId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
  twoFactorRequired?: boolean;
  twoFactorType?: string;
  tempToken?: string;
  authenticated?: boolean;
  verificationRequired?: boolean;
  purpose?: string;
  maskedEmail?: string;
  expiresInSeconds?: number;
  emailDelivered?: boolean;
  smsDelivered?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'ROLE_POSTER' | 'ROLE_CLIENT';
  otpCode?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface PostJobData {
  title: string;
  description: string;
  jobType: 'TEMPORARY' | 'PERMANENT';
  category: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  durationDays?: number | null;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
}

export interface ApplicationData {
  jobId: number;
  message: string;
}

export interface ReviewData {
  jobId: number;
  revieweeId: number;
  rating: number;
  comment: string;
}
