import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a timestamp as a relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

/**
 * Format a timestamp as a date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Build Graph API URL
 */
export function buildGraphAPIURL(
  path: string,
  searchParams: Record<string, any>,
  accessToken?: string
): string {
  const GRAPH_API_BASE_URL = `https://graph.threads.net/${process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : ''}`;

  const url = new URL(path, GRAPH_API_BASE_URL);

  Object.keys(searchParams).forEach(key => {
    if (searchParams[key] !== undefined && searchParams[key] !== null) {
      url.searchParams.append(key, String(searchParams[key]));
    }
  });

  if (accessToken) {
    url.searchParams.append('access_token', accessToken);
  }

  return url.toString();
}
