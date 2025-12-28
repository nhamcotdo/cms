# Database Layer - TypeScript Migration

This directory contains the complete TypeScript database layer for the Threads Admin Panel. It provides type-safe database models compatible with Next.js App Router and Server Components.

## Structure

```
lib/db/
├── index.ts              # Database singleton and connection management
├── schema.ts             # TypeScript types and constants
├── migrations.ts         # Migration runner
├── models/               # Individual model files
│   ├── index.ts         # Model barrel export
│   ├── scheduled-posts.ts
│   ├── media-files.ts
│   ├── post-history.ts
│   ├── user-settings.ts
│   ├── accounts.ts
│   ├── account-cookies.ts
│   ├── admin-users.ts
│   ├── admin-sessions.ts
│   ├── post-analytics.ts
│   ├── post-comments.ts
│   └── bulk-imports.ts
└── README.md            # This file
```

## Usage

### Initializing the Database

```typescript
import { initializeDatabase, getDb } from '@/lib/db';

// Initialize database (runs schema and migrations)
initializeDatabase();

// Get database instance
const db = getDb();
```

### Using Models

```typescript
import {
  ScheduledPostsModel,
  AccountsModel,
  AdminUsersModel,
  POST_STATUS
} from '@/lib/db/models';

// Create a scheduled post
const post = ScheduledPostsModel.create({
  text: 'Hello from TypeScript!',
  scheduled_for: Math.floor(Date.now() / 1000) + 3600,
  account_id: 1,
});

// Find posts due for publishing
const duePosts = ScheduledPostsModel.getDuePosts();

// Update post status
ScheduledPostsModel.update(post.id, {
  status: POST_STATUS.PUBLISHED,
});

// Get account
const account = AccountsModel.findById(1);

// Find admin user
const user = await AdminUsersModel.findByUsername('admin');
```

### Working with Server Components

```typescript
import { ScheduledPostsModel, AccountsModel } from '@/lib/db/models';
import { initializeDatabase } from '@/lib/db';

// In a Server Component or Route Handler
export default async function DashboardPage() {
  // Database auto-initializes on first use
  const posts = ScheduledPostsModel.findAll({
    status: POST_STATUS.SCHEDULED,
    limit: 10,
  });

  const accounts = AccountsModel.findAll({ is_active: true });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>{posts.length} scheduled posts</p>
      <p>{accounts.length} active accounts</p>
    </div>
  );
}
```

## Database Singleton

The database uses a singleton pattern to ensure only one connection exists per process:

- **Development**: Connection persists across hot reloads
- **Production**: Connection persists in serverless function warm state
- **App Router**: Safe to use in Server Components and Route Handlers

## Models

### ScheduledPostsModel
Manage scheduled posts with full CRUD operations.

### MediaFilesModel
Track uploaded media files with metadata.

### PostHistoryModel
Maintain history of published posts.

### UserSettingsModel
Application configuration and settings.

### AccountsModel
Manage Threads accounts for posting.

### AccountCookiesModel
Store session cookies for accounts.

### AdminUsersModel
Admin user authentication with bcrypt password hashing.

### AdminSessionsModel
Session management for admin authentication.

### PostAnalyticsModel
Track engagement metrics (likes, comments, shares, views).

### PostCommentsModel
Store and retrieve comments from Threads posts.

### BulkImportsModel
Track bulk import operations and status.

## Type Safety

All models use TypeScript types from `schema.ts`:

```typescript
import type {
  ScheduledPost,
  CreateScheduledPostInput,
  UpdateScheduledPostInput,
  PostStatus,
  MediaType
} from '@/lib/db/models';
```

## Migrations

Migrations are automatically run on database initialization. Migration files are stored in `src/database/migrations/` and are shared with the legacy Express app.

```typescript
import { runMigrations, getExecutedMigrations } from '@/lib/db/migrations';

// Run pending migrations
runMigrations();

// Check executed migrations
const executed = getExecutedMigrations();
```

## Error Handling

Models return `null` for not-found results:

```typescript
const post = ScheduledPostsModel.findById(999);
if (!post) {
  // Handle not found
}
```

Database errors are thrown and should be caught:

```typescript
try {
  const post = ScheduledPostsModel.create(input);
} catch (error) {
  console.error('Failed to create post:', error);
  // Handle error
}
```

## Best Practices

1. **Server-Side Only**: Always use these models in Server Components or Route Handlers
2. **Type Safety**: Use TypeScript types from `schema.ts` for all inputs
3. **Connection Management**: Let the singleton handle connections; don't call `closeDatabase()`
4. **Async Operations**: Only `AdminUsersModel` uses async methods (bcrypt)
5. **Transaction Support**: Use `db.transaction()` for complex multi-step operations

## Migration from JavaScript

The legacy JavaScript models in `src/database/` remain untouched and continue to work with the Express app (`npm run start:legacy`). Both systems share the same SQLite database file.

Key differences:

- **TypeScript**: Full type safety with IntelliSense
- **Modern syntax**: Arrow functions, async/await, template literals
- **Better patterns**: Singleton, dependency injection, functional approach
- **Next.js ready**: Optimized for App Router and Server Components

## Database Location

The SQLite database file is located at the project root: `threads_admin.db`

Both the Next.js app and Express app share this database file.

## Performance Notes

- WAL mode enabled for better concurrency
- Prepared statements cached automatically
- Indexes on all foreign keys and common query fields
- Connection pooling handled by better-sqlite3

## Contributing

When adding new models:

1. Add types to `lib/db/schema.ts`
2. Create model file in `lib/db/models/`
3. Export from `lib/db/models/index.ts`
4. Follow existing patterns for consistency
