export interface User {
  id: number;
  username: string;
  password: string;
  threads_user_id?: string;
  threads_profile_picture_url?: string;
  created_at: number;
}

export interface ThreadsAccount {
  id: number;
  username: string;
  threads_user_id: string;
  threads_profile_picture_url?: string;
  token: string;
  is_active: number;
  created_at: number;
}

export interface ScheduledPost {
  id: number;
  text: string;
  media_type: string;
  scheduled_for: number;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  container_id?: string;
  thread_id?: string;
  attachment_data?: string;
  reply_control?: string;
  reply_to_id?: string;
  link_attachment?: string;
  topic_tag?: string;
  quote_post_id?: string;
  is_spoiler_media: number;
  poll_attachment?: string;
  text_entities?: string;
  retry_count: number;
  error_message?: string;
  created_at: number;
  updated_at: number;
  published_at?: number;
}

export interface MediaFile {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  url: string;
  alt_text?: string;
  uploaded_at: number;
}

export interface PostHistory {
  id: number;
  container_id?: string;
  thread_id?: string;
  text?: string;
  media_type?: string;
  status: string;
  published_at?: number;
  attachment_data?: string;
  created_at: number;
}

export interface UserSetting {
  id: number;
  key: string;
  value: string;
  updated_at: number;
}

export interface PostData {
  text?: string;
  media_type?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  saveType?: 'draft' | 'schedule' | 'publish';
  attachment?: string;
  replyControl?: string;
}
