import api from './api';
import type { Job, ApiResponse, PaginatedResponse, PostJobData, ApplicationData, Review, ReviewData } from '../types';

export const jobService = {
  async getJobs(page = 0, size = 9): Promise<PaginatedResponse<Job>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Job>>>('/jobs', {
      params: { page, size },
    });
    return response.data.data;
  },

  async getJobById(id: number): Promise<Job> {
    const response = await api.get<ApiResponse<Job>>(`/jobs/${id}`);
    return response.data.data;
  },

  async searchJobs(params: {
    keyword?: string;
    location?: string;
    type?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Job>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Job>>>('/jobs/search', {
      params,
    });
    return response.data.data;
  },

  async createJob(data: PostJobData): Promise<Job> {
    const response = await api.post<ApiResponse<Job>>('/jobs', data);
    return response.data.data;
  },

  async uploadJobImage(jobId: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<ApiResponse<string>>(`/jobs/${jobId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async applyToJob(data: ApplicationData): Promise<void> {
    await api.post('/applications', data);
  },

  async getJobReviews(jobId: number): Promise<Review[]> {
    const response = await api.get<ApiResponse<Review[]>>(`/reviews/job/${jobId}`);
    return response.data.data;
  },

  async createReview(data: ReviewData): Promise<Review> {
    const response = await api.post<ApiResponse<Review>>('/reviews', data);
    return response.data.data;
  },
};
