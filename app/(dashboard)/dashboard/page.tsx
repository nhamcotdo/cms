import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to Threads Admin Panel - Next.js 15 Edition
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Scheduled Posts"
          value="0"
          description="Posts waiting to be published"
          color="blue"
        />
        <StatCard
          title="Drafts"
          value="0"
          description="Posts saved as drafts"
          color="yellow"
        />
        <StatCard
          title="Published"
          value="0"
          description="Successfully published posts"
          color="green"
        />
        <StatCard
          title="Media Files"
          value="0"
          description="Uploaded images and videos"
          color="purple"
        />
      </div>

      {/* Migration Notice */}
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Migration in Progress</CardTitle>
          <CardDescription>
            This is the new Next.js 15 App Router version. The legacy Express version is still available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              The migration is happening in phases. Currently completed:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Phase 1: Project Setup and Infrastructure ✓</li>
              <li>Phase 2: Database Layer (Pending)</li>
              <li>Phase 3: Authentication System (Pending)</li>
              <li>Phase 4: API Migration (Pending)</li>
              <li>Phase 5: UI Components (Pending)</li>
            </ul>
            <div className="flex gap-4 pt-4">
              <a
                href="/login"
                className="text-sm text-blue-600 hover:underline"
              >
                Go to Login Page
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: string;
  description: string;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className={`mt-4 h-2 rounded-full ${colorClasses[color]}`} />
      </CardContent>
    </Card>
  );
}
