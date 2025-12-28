export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface AuthSession {
  userId: number;
  username: string;
  token: string;
  createdAt: number;
}

export interface ThreadsApiResponse {
  data?: Record<string, unknown>;
  error?: {
    message: string;
    code: number;
    type: string;
  };
}

export interface MediaType {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink?: string;
}

export * from './database';
