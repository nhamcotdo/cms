import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  ScheduledPostsModel,
  MediaFilesModel,
  PostHistoryModel,
} from '@/lib/db/models';
import { POST_STATUS } from '@/lib/db/schema';
import DashboardClient from './client';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/admin/auth/login');
  }

  // Calculate stats
  const scheduledCount = ScheduledPostsModel.findAll({
    status: POST_STATUS.SCHEDULED,
  }).length;
  const draftCount = ScheduledPostsModel.findAll({
    status: POST_STATUS.DRAFT,
  }).length;
  const publishedCount = ScheduledPostsModel.findAll({
    status: POST_STATUS.PUBLISHED,
  }).length;
  const failedCount = ScheduledPostsModel.findAll({
    status: POST_STATUS.FAILED,
  }).length;
  const mediaCount = MediaFilesModel.findAll().length;
  const totalPosts = PostHistoryModel.findAll().length;

  const recentPosts = ScheduledPostsModel.findAll({ limit: 5 });

  return (
    <DashboardClient
      stats={{
        scheduled: scheduledCount,
        drafts: draftCount,
        published: publishedCount,
        failed: failedCount,
        media: mediaCount,
        totalPosts,
      }}
      recentPosts={recentPosts}
    />
  );
}
