export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: 'ROLE_POSTER' | 'ROLE_CLIENT' | 'ROLE_ADMIN';
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

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
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
