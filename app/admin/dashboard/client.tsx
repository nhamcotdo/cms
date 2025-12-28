'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface DashboardClientProps {
  stats: {
    scheduled: number;
    drafts: number;
    published: number;
    failed: number;
    media: number;
    totalPosts: number;
  };
  recentPosts: any[];
}

export default function DashboardClient({ stats, recentPosts }: DashboardClientProps) {
  const deletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      alert('Error deleting post');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500';
      case 'published': return 'bg-green-500/20 text-green-500 border-green-500';
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500';
      case 'failed': return 'bg-red-500/20 text-red-500 border-red-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to your Threads Admin Panel</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-6">
            <div className="text-sm font-semibold text-yellow-500 uppercase tracking-wider mb-1">
              Scheduled Posts
            </div>
            <div className="text-4xl font-bold text-white">{stats.scheduled}</div>
          </div>

          <div className="bg-gray-500/10 border-2 border-gray-500/30 rounded-xl p-6">
            <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Drafts
            </div>
            <div className="text-4xl font-bold text-white">{stats.drafts}</div>
          </div>

          <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-6">
            <div className="text-sm font-semibold text-green-500 uppercase tracking-wider mb-1">
              Published Today
            </div>
            <div className="text-4xl font-bold text-white">{stats.published}</div>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Total Posts
            </div>
            <div className="text-4xl font-bold text-green-500">{stats.totalPosts}</div>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Media Files
            </div>
            <div className="text-4xl font-bold text-green-500">{stats.media}</div>
          </div>

          <div className={`${stats.failed > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-900 border-zinc-800'} border-2 rounded-xl p-6`}>
            <div className={`text-sm font-semibold uppercase tracking-wider mb-1 ${stats.failed > 0 ? 'text-red-500' : 'text-gray-500'}`}>
              Failed Posts
            </div>
            <div className="text-4xl font-bold text-white">{stats.failed}</div>
          </div>
        </div>

        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b-2 border-zinc-800">
            <h2 className="text-2xl font-bold text-white">Recent Posts</h2>
          </div>

          {recentPosts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Text
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Scheduled For
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {recentPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <p className="text-sm text-white max-w-xs truncate">
                          {post.text || <em className="text-gray-500">No text</em>}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-400">
                          {post.scheduled_for ? formatDistanceToNow(new Date(post.scheduled_for * 1000), { addSuffix: true }) : <em className="text-gray-500">Not scheduled</em>}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/scheduled/${post.id}/edit`}
                            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded transition-colors"
                          >
                            Edit
                          </Link>
                          {post.status === 'scheduled' && (
                            <button
                              onClick={() => deletePost(post.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
              <p className="text-gray-400 mb-4">Create your first post to get started.</p>
              <Link
                href="/admin/create-post"
                className="inline-block px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-medium rounded transition-colors"
              >
                Create Post
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
