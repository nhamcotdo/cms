# Database Layer - Quick Reference

## Import Patterns

### Import Everything
```typescript
import {
  ScheduledPostsModel,
  AccountsModel,
  AdminUsersModel,
  POST_STATUS,
  MEDIA_TYPE,
  type ScheduledPost,
  type CreateScheduledPostInput,
} from '@/lib/db/models';
```

### Import Specific Model
```typescript
import { ScheduledPostsModel, POST_STATUS } from '@/lib/db/models/scheduled-posts';
```

### Import Database Connection
```typescript
import { initializeDatabase, getDb } from '@/lib/db';
```

## Common Operations

### Create Record
```typescript
const post = ScheduledPostsModel.create({
  text: 'Hello World',
  scheduled_for: Math.floor(Date.now() / 1000) + 3600,
  account_id: 1,
  status: POST_STATUS.SCHEDULED,
});
```

### Find By ID
```typescript
const post = ScheduledPostsModel.findById(1);
if (!post) {
  // Handle not found
}
```

### Find With Filters
```typescript
const posts = ScheduledPostsModel.findAll({
  status: POST_STATUS.SCHEDULED,
  account_id: 1,
  limit: 10,
});
```

### Update Record
```typescript
const updated = ScheduledPostsModel.update(1, {
  status: POST_STATUS.PUBLISHED,
  published_at: Math.floor(Date.now() / 1000),
});
```

### Delete Record
```typescript
const deleted = ScheduledPostsModel.delete(1);
if (deleted) {
  console.log('Post deleted');
}
```

## Special Methods by Model

### ScheduledPostsModel
```typescript
// Get posts due for publishing
const duePosts = ScheduledPostsModel.getDuePosts();

// Get posts by account
const accountPosts = ScheduledPostsModel.findByAccountId(accountId);

// Count by status
const count = ScheduledPostsModel.countByStatus(POST_STATUS.SCHEDULED);
```

### AccountsModel
```typescript
// Find by Threads user ID
const account = AccountsModel.findByThreadsUserId(threadsUserId);

// Update last used
AccountsModel.updateLastUsed(accountId);

// Count active accounts
const activeCount = AccountsModel.countActive();
```

### AdminUsersModel
```typescript
// Verify password (async)
const isValid = await AdminUsersModel.verifyPassword(user, password);

// Update password (async)
await AdminUsersModel.updatePassword(userId, newPassword);

// Find by username
const user = await AdminUsersModel.findByUsername('admin');
```

### AdminSessionsModel
```typescript
// Create session
const session = AdminSessionsModel.create(userId, 604800); // 7 days

// Validate and get user ID
const userId = AdminSessionsModel.validateAndGetUserId(token);

// Count active sessions
const count = AdminSessionsModel.countByUserId(userId);
```

### MediaFilesModel
```typescript
// Find by filename
const file = MediaFilesModel.findByFilename('image.jpg');

// Get total storage used
const totalSize = MediaFilesModel.getTotalSize();

// Count files
const count = MediaFilesModel.count();
```

### PostAnalyticsModel
```typescript
// Create or update
const analytics = PostAnalyticsModel.upsert({
  post_id: 1,
  likes_count: 100,
  comments_count: 25,
});

// Get overall stats
const stats = PostAnalyticsModel.getOverallStats();
console.log(`Total likes: ${stats.total_likes}`);
```

### PostCommentsModel
```typescript
// Bulk insert
const comments = PostCommentsModel.bulkInsert([
  { post_id: 1, thread_id: 'abc', comment_id: 'c1', comment_text: 'First!' },
  { post_id: 1, thread_id: 'abc', comment_id: 'c2', comment_text: 'Great!' },
]);

// Get comment count
const count = PostCommentsModel.getCountByPostId(postId);
```

### BulkImportsModel
```typescript
// Increment counters
const updated = BulkImportsModel.incrementCounters(importId, true, false);

// Get user stats
const stats = BulkImportsModel.getStatsByAdminUser(userId);
```

### UserSettingsModel
```typescript
// Get as number
const maxSize = UserSettingsModel.getNumber('max_file_size', 10485760);

// Get as boolean
const enabled = UserSettingsModel.getBoolean('scheduler_enabled', false);

// Get all settings
const all = UserSettingsModel.getAll();
```

## Type Safety Examples

### Using Input Types
```typescript
import type { CreateScheduledPostInput } from '@/lib/db/models';

function createPost(data: CreateScheduledPostInput) {
  return ScheduledPostsModel.create(data);
}
```

### Using Response Types
```typescript
import type { ScheduledPost } from '@/lib/db/models';

function getPost(id: number): ScheduledPost | null {
  return ScheduledPostsModel.findById(id);
}
```

### Status Enums
```typescript
import { POST_STATUS, MEDIA_TYPE } from '@/lib/db/models';

const status: PostStatus = POST_STATUS.SCHEDULED;
const media: MediaType = MEDIA_TYPE.IMAGE;
```

## Server Component Usage

```typescript
import { ScheduledPostsModel, AccountsModel } from '@/lib/db/models';

export default async function Dashboard() {
  // Direct database access in Server Component
  const posts = ScheduledPostsModel.findAll({
    status: POST_STATUS.SCHEDULED,
    limit: 10,
  });

  const accounts = AccountsModel.findAll({ is_active: true });

  return (
    <div>
      <h1>{posts.length} Scheduled Posts</h1>
      <h2>{accounts.length} Active Accounts</h2>
    </div>
  );
}
```

## Route Handler Usage

```typescript
import { ScheduledPostsModel } from '@/lib/db/models';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const posts = ScheduledPostsModel.findAll({ limit: 10 });
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const post = ScheduledPostsModel.create(body);
  return NextResponse.json(post);
}
```

## Error Handling

```typescript
try {
  const post = ScheduledPostsModel.create(input);
  if (!post) {
    return { error: 'Failed to create post' };
  }
  return { success: true, post };
} catch (error) {
  console.error('Database error:', error);
  return { error: 'Database operation failed' };
}
```

## Best Practices

1. **Always handle null results**
   ```typescript
   const post = ScheduledPostsModel.findById(id);
   if (!post) {
     // Handle not found
   }
   ```

2. **Use TypeScript types**
   ```typescript
   import type { CreateScheduledPostInput } from '@/lib/db/models';
   const input: CreateScheduledPostInput = { ... };
   ```

3. **Use enums for constants**
   ```typescript
   status: POST_STATUS.SCHEDULED  // ✓ Good
   status: 'scheduled'            // ✗ Avoid
   ```

4. **Let the singleton manage connections**
   - Don't call `getDb()` directly in most cases
   - Don't call `closeDatabase()` (it's automatic)
   - Database auto-initializes on first use

5. **Use filters for complex queries**
   ```typescript
   // ✓ Good
   const posts = ScheduledPostsModel.findAll({
     status: POST_STATUS.SCHEDULED,
     account_id: 1,
     limit: 10,
   });

   // ✗ Avoid (write raw SQL only if necessary)
   const db = getDb();
   const posts = db.prepare('SELECT * FROM ...').all();
   ```
