import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function formatScheduleDateTime(dateString: string, timeString: string): number {
  const dateTime = new Date(`${dateString}T${timeString}`);
  return Math.floor(dateTime.getTime() / 1000);
}

export function unixToTimestamp(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000);
}
