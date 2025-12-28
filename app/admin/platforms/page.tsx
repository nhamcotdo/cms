import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AccountsModel } from '@/lib/db/models';
import { ScheduledPostsModel } from '@/lib/db/models';
import { POST_STATUS } from '@/lib/db/schema';

export default async function PlatformsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/admin/auth/login');
  }

  // Get threads accounts for current user
  const threadsAccounts = AccountsModel.findByAdminUserId(user.id);
  const activeAccounts = threadsAccounts.filter(a => a.is_active);

  // Calculate stats
  let threadsStats = { total: 0, published: 0 };

  threadsAccounts.forEach(account => {
    const accountPosts = ScheduledPostsModel.findAll().filter(p => p.account_id === account.id);
    threadsStats.total += accountPosts.length;
    threadsStats.published += accountPosts.filter(p => p.status === POST_STATUS.PUBLISHED).length;
  });

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Choose Your Platform</h1>
          <p className="text-gray-400">Select a platform to connect and manage your social media channels</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Threads Platform Card */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-200">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Threads</h2>
              <p className="text-gray-400 text-sm">
                Meta's text-based social platform. Share updates, engage with your audience, and grow your community.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-t-2 border-b-2 border-zinc-800">
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Accounts</div>
                <div className="text-2xl font-bold text-green-500 mt-1">{activeAccounts.length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Posts</div>
                <div className="text-2xl font-bold text-green-500 mt-1">{threadsStats.total}</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Published</div>
                <div className="text-2xl font-bold text-green-500 mt-1">{threadsStats.published}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {activeAccounts.length > 0 && (
                <a
                  href="/admin/dashboard"
                  className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded text-center transition-colors"
                >
                  Dashboard
                </a>
              )}
              <a
                href="/oauth"
                className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-black font-medium rounded text-center transition-colors"
              >
                Add Account
              </a>
            </div>
          </div>

          {/* Instagram - Coming Soon */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 opacity-50">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                </svg>
              </div>
            </div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Instagram</h2>
              <p className="text-gray-400 text-sm">Coming soon.</p>
            </div>
            <div className="inline-block px-3 py-1 bg-zinc-800 rounded text-xs font-semibold text-gray-500 uppercase">
              Coming Soon
            </div>
          </div>

          {/* Facebook - Coming Soon */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 opacity-50">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </div>
            </div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Facebook</h2>
              <p className="text-gray-400 text-sm">Coming soon.</p>
            </div>
            <div className="inline-block px-3 py-1 bg-zinc-800 rounded text-xs font-semibold text-gray-500 uppercase">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
