/**
 * Database schema types and constants
 */

export const POST_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];

export const MEDIA_TYPE = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  CAROUSEL: 'CAROUSEL_ALBUM',
} as const;

export type MediaType = typeof MEDIA_TYPE[keyof typeof MEDIA_TYPE];

export const IMPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ImportStatus = typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS];

/**
 * Scheduled post interfaces
 */
export interface ScheduledPost {
  id: number;
  text: string;
  media_type: MediaType;
  scheduled_for: number;
  status: PostStatus;
  container_id?: string | null;
  thread_id?: string | null;
  attachment_data?: AttachmentData | null;
  reply_control?: string | null;
  reply_to_id?: string | null;
  link_attachment?: string | null;
  topic_tag?: string | null;
  quote_post_id?: string | null;
  is_spoiler_media: boolean;
  poll_attachment?: PollAttachment | null;
  text_entities?: any[] | null;
  retry_count: number;
  error_message?: string | null;
  created_at: number;
  updated_at: number;
  published_at?: number | null;
  account_id?: number | null;
}

export interface AttachmentData {
  media_type?: string;
  media_urls?: string[];
  thumbnail_urls?: string[];
  alt_text?: string[];
}

export interface PollAttachment {
  options: string[];
  duration?: number;
}

export interface CreateScheduledPostInput {
  text: string;
  media_type?: MediaType;
  scheduled_for: number;
  status?: PostStatus;
  attachment_data?: AttachmentData;
  reply_control?: string;
  reply_to_id?: string;
  link_attachment?: string;
  topic_tag?: string;
  quote_post_id?: string;
  is_spoiler_media?: boolean;
  poll_attachment?: PollAttachment;
  text_entities?: any[];
  account_id?: number;
}

export interface UpdateScheduledPostInput {
  text?: string;
  media_type?: MediaType;
  scheduled_for?: number;
  status?: PostStatus;
  container_id?: string | null;
  thread_id?: string | null;
  published_at?: number | null;
  attachment_data?: AttachmentData;
  reply_control?: string;
  reply_to_id?: string;
  link_attachment?: string;
  topic_tag?: string;
  quote_post_id?: string;
  is_spoiler_media?: boolean;
  poll_attachment?: PollAttachment;
  text_entities?: any[];
  retry_count?: number;
  error_message?: string;
  account_id?: number;
}

/**
 * Media file interfaces
 */
export interface MediaFile {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  url: string;
  alt_text?: string | null;
  uploaded_at: number;
}

export interface CreateMediaFileInput {
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  url: string;
  alt_text?: string;
}

/**
 * Post history interfaces
 */
export interface PostHistory {
  id: number;
  container_id?: string | null;
  thread_id?: string | null;
  text?: string | null;
  media_type?: string | null;
  status: string;
  published_at?: number | null;
  attachment_data?: AttachmentData | null;
  created_at: number;
}

export interface CreatePostHistoryInput {
  container_id?: string;
  thread_id?: string;
  text?: string;
  media_type?: string;
  status?: string;
  published_at?: number;
  attachment_data?: AttachmentData;
}

/**
 * User settings interfaces
 */
export interface UserSetting {
  id: number;
  key: string;
  value: string;
  updated_at: number;
}

/**
 * Account interfaces
 */
export interface Account {
  id: number;
  threads_user_id: string;
  username: string;
  threads_profile_picture_url?: string | null;
  threads_biography?: string | null;
  access_token: string;
  token_expires_at?: number | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
  last_used_at?: number | null;
  admin_user_id?: number | null;
}

export interface CreateAccountInput {
  threads_user_id: string;
  username: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
  access_token: string;
  token_expires_at?: number;
  is_active?: boolean;
  admin_user_id?: number;
}

export interface UpdateAccountInput {
  username?: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
  access_token?: string;
  token_expires_at?: number;
  is_active?: boolean;
  admin_user_id?: number;
}

/**
 * Account cookie interfaces
 */
export interface AccountCookie {
  id: number;
  account_id: number;
  cookie_name: string;
  cookie_value: string;
  expires_at?: number | null;
  created_at: number;
}

/**
 * Admin user interfaces
 */
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface CreateAdminUserInput {
  username: string;
  email: string;
  password: string;
  is_active?: boolean;
}

export interface UpdateAdminUserInput {
  username?: string;
  email?: string;
  is_active?: boolean;
}

/**
 * Admin session interfaces
 */
export interface AdminSession {
  id: number;
  admin_user_id: number;
  session_token: string;
  expires_at: number;
  created_at: number;
}

/**
 * Post analytics interfaces
 */
export interface PostAnalytics {
  id: number;
  post_id: number;
  thread_id?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  quote_count: number;
  fetched_at: number;
  created_at: number;
}

export interface CreatePostAnalyticsInput {
  post_id: number;
  thread_id?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  quote_count?: number;
}

export interface UpdatePostAnalyticsInput {
  thread_id?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  quote_count?: number;
}

/**
 * Post comment interfaces
 */
export interface PostComment {
  id: number;
  post_id: number;
  thread_id: string;
  comment_id: string;
  comment_text: string;
  author_username?: string | null;
  author_avatar_url?: string | null;
  created_at: number;
}

export interface CreatePostCommentInput {
  post_id: number;
  thread_id: string;
  comment_id: string;
  comment_text: string;
  author_username?: string;
  author_avatar_url?: string;
}

/**
 * Bulk import interfaces
 */
export interface BulkImport {
  id: number;
  admin_user_id: number;
  file_name: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  status: ImportStatus;
  created_at: number;
  completed_at?: number | null;
}

export interface CreateBulkImportInput {
  admin_user_id: number;
  file_name: string;
  total_rows?: number;
  success_count?: number;
  error_count?: number;
  status?: ImportStatus;
}

export interface UpdateBulkImportInput {
  total_rows?: number;
  success_count?: number;
  error_count?: number;
  status?: ImportStatus;
  completed_at?: number;
}
