import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Link2,
  BarChart3,
  PenSquare,
  Clock,
  ScrollText,
  Image as ImageIcon,
  Users,
  Download,
  LogOut
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const navItems = [
    { href: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { href: '/admin/platforms', icon: Link2, label: 'Platforms' },
    { href: '/admin/create', icon: PenSquare, label: 'Create Post' },
    { href: '/admin/scheduled', icon: Clock, label: 'Scheduled Posts' },
    { href: '/admin/history', icon: ScrollText, label: 'Post History' },
    { href: '/admin/media', icon: ImageIcon, label: 'Media Library' },
    { href: '/admin/accounts', icon: Users, label: 'Accounts' },
    { href: '/admin/import', icon: Download, label: 'Import Posts' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Threads Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your content</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            href="/api/auth/logout"
            className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
