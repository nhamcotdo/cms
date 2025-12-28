# Multi-Account Management & Analytics Features

## Status: Draft

## Overview

This specification details the implementation of multi-account management, bulk post import, social analytics tracking, and commenting functionality for the Threads Admin Panel.

## Goals

1. **Multi-Account Management** - Manage multiple Threads accounts without re-login
2. **Bulk Post Import** - Import posts from CSV/JSON files
3. **Social Analytics** - Track likes, comments, shares metrics
4. **In-Panel Commenting** - Comment on posts directly from the admin panel
5. **Cookie Persistence** - Store account cookies in database for session management
6. **User Authentication** - Register/login system for admin users

## Non-Goals

- Thread user management (public Threads users)
- Real-time notifications from Threads
- Direct messaging functionality
- Account automation/botting features

## Database Schema Changes

### New Tables

#### accounts (Threads Accounts)
```sql
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threads_user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    threads_profile_picture_url TEXT,
    threads_biography TEXT,
    access_token TEXT NOT NULL,
    token_expires_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_used_at INTEGER
);
```

#### account_cookies
```sql
CREATE TABLE IF NOT EXISTS account_cookies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    cookie_name TEXT NOT NULL,
    cookie_value TEXT NOT NULL,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
```

#### admin_users (Local Admin Users)
```sql
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

#### admin_sessions
```sql
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
```

#### post_analytics
```sql
CREATE TABLE IF NOT EXISTS post_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    thread_id TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    quote_count INTEGER DEFAULT 0,
    fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
);
```

#### post_comments
```sql
CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    thread_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    author_username TEXT,
    author_avatar_url TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
);
```

#### bulk_imports
```sql
CREATE TABLE IF NOT EXISTS bulk_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
```

## Implementation Plan

### Phase 1: Multi-Account Management

#### 1.1 Account Storage
- Create `accounts` table schema
- Add `AccountsModel` for CRUD operations
- Store Threads OAuth tokens per account

#### 1.2 Account Switching
- Add account selector dropdown in sidebar
- "Add Account" button to link new Threads accounts
- Switch current account globally
- Display current account info

#### 1.3 Cookie Persistence
- Store account cookies in `account_cookies` table
- Load cookies when switching accounts
- Auto-refresh tokens before expiry

### Phase 2: Admin Authentication

#### 2.1 User Registration
- Registration page: `/admin/register`
- Username, email, password fields
- Password hashing with bcrypt
- Email validation

#### 2.2 User Login
- Login page: `/admin/login` (separate from Threads OAuth)
- Session-based authentication
- Remember me functionality
- Session expiration

#### 2.3 Protected Routes
- All admin routes require admin authentication
- Redirect to login if not authenticated
- Logout functionality

### Phase 3: Bulk Post Import

#### 3.1 CSV Import Format
```csv
text,media_type,schedule_date,schedule_time,reply_control,topic_tag
"Post 1 text","TEXT","2025-01-15","10:00","mentioned_only","tech"
"Post 2 text","IMAGE","2025-01-16","14:00","","travel"
```

#### 3.2 JSON Import Format
```json
[
  {
    "text": "Post text",
    "media_type": "IMAGE",
    "media_url": "https://example.com/image.jpg",
    "schedule_date": "2025-01-15",
    "schedule_time": "10:00",
    "reply_control": "mentioned_only",
    "topic_tag": "tech"
  }
]
```

#### 3.3 Import Page
- File upload (CSV/JSON)
- Preview before import
- Validation of data
- Progress tracking during import
- Error reporting per row

### Phase 4: Social Analytics

#### 4.1 Analytics Fetching
- Background job to fetch analytics for published posts
- Use Threads API insights endpoints
- Store in `post_analytics` table
- Update every hour

#### 4.2 Analytics Display
- Dashboard widgets for total likes/comments
- Per-post analytics view
- Historical data charts
- Export analytics as CSV

### Phase 5: In-Panel Commenting

#### 5.1 Comments List
- Fetch comments for each post via Threads API
- Store in `post_comments` table
- Display in post detail view

#### 5.2 Comment Creation
- Comment form in post detail view
- Post comment via Threads API
- Store sent comments

#### 5.3 Comment Management
- Delete own comments
- Hide/unhide functionality
- Reply to comments

## Technical Details

### Multi-Account Session Management

```javascript
// Current account stored in session
req.session.currentAccountId = accountId;

// Load account cookies on switch
function loadAccountCookies(accountId) {
    const cookies = AccountCookiesModel.findByAccountId(accountId);
    cookies.forEach(cookie => {
        // Apply to request
    });
}
```

### Scheduler Enhancement

```javascript
// Scheduler processes posts for ALL active accounts
async function processAllAccounts() {
    const activeAccounts = AccountsModel.findAll({ is_active: true });

    for (const account of activeAccounts) {
        await processScheduledPosts(account);
    }
}
```

### Analytics Fetching

```javascript
// Use Threads Insights API
async function fetchPostAnalytics(threadId, accessToken) {
    const url = `https://graph.threads.net/${threadId}/insights`;
    const metrics = ['likes_count', 'comments_count', 'views_count'];

    const response = await axios.get(url, {
        params: { metric: metrics.join(',') },
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    return response.data;
}
```

## UI Changes

### New Pages

1. **Account Management** (`/admin/accounts`)
   - List all accounts
   - Add new account
   - Switch account
   - Edit account
   - Delete account

2. **Import Posts** (`/admin/import`)
   - File upload
   - Format guide
   - Preview
   - Import progress

3. **Analytics Dashboard** (`/admin/analytics`)
   - Overall stats
   - Per-post analytics
   - Charts
   - Export

4. **Admin Auth** (`/admin/auth/login`, `/admin/auth/register`)
   - Login form
   - Register form

### Updated Pages

1. **Sidebar** - Add account switcher
2. **Scheduled Posts** - Add analytics data
3. **Post History** - Add comment count, likes
4. **Dashboard** - Add account-specific stats

## Security Considerations

1. **Password Security**
   - bcrypt with salt rounds >= 10
   - Minimum password length: 8 characters
   - Password strength validation

2. **Session Security**
   - HTTPS-only cookies in production
   - Secure flag on cookies
   - SameSite protection
   - Expiration: 7 days for admin sessions

3. **Token Storage**
   - Encrypt access tokens in database
   - Separate database for tokens or encryption at rest
   - Token rotation on expiry

4. **Authentication**
   - Rate limiting on login
   - Account lockout after failed attempts
   - CSRF protection on forms

## File Structure

```
src/
├── database/
│   ├── schema.sql (updated)
│   ├── models.js (updated)
│   └── migrations/
│       └── 001_multi_account.sql
├── routes/
│   ├── admin.js (updated)
│   ├── auth.js (new)
│   ├── accounts.js (new)
│   ├── import.js (new)
│   └── analytics.js (new)
├── services/
│   ├── scheduler.js (updated)
│   ├── analytics.js (new)
│   ├── threads-api.js (new)
│   └── import.js (new)
├── middleware/
│   ├── auth.js (new)
│   └── account.js (new)
└── utils/
    ├── crypto.js (new)
    └── validation.js (new)

views/admin/
├── auth/
│   ├── login.pug (new)
│   └── register.pug (new)
├── accounts/
│   ├── list.pug (new)
│   └── switch.pug (new)
├── import/
│   └── index.pug (new)
└── analytics/
    └── dashboard.pug (new)
```

## API Endpoints

### Authentication
- `POST /admin/auth/register` - Register admin user
- `POST /admin/auth/login` - Login admin user
- `POST /admin/auth/logout` - Logout
- `GET /admin/auth/me` - Get current user

### Accounts
- `GET /admin/api/accounts` - List all accounts
- `POST /admin/api/accounts` - Add account (Threads OAuth)
- `PUT /admin/api/accounts/:id/switch` - Switch to account
- `PUT /admin/api/accounts/:id` - Update account
- `DELETE /admin/api/accounts/:id` - Remove account

### Import
- `POST /admin/api/import/validate` - Validate import file
- `POST /admin/api/import/execute` - Execute import
- `GET /admin/api/import/:id/status` - Get import status

### Analytics
- `GET /admin/api/analytics/overview` - Overall statistics
- `GET /admin/api/analytics/post/:id` - Post analytics
- `POST /admin/api/analytics/fetch` - Fetch latest analytics

### Comments
- `GET /admin/api/comments/post/:id` - List post comments
- `POST /admin/api/comments` - Create comment
- `DELETE /admin/api/comments/:id` - Delete comment
- `POST /admin/api/comments/:id/hide` - Hide comment
- `POST /admin/api/comments/:id/unhide` - Unhide comment

## Testing Strategy

### Unit Tests
- Account model CRUD
- Authentication flow
- Import validation logic
- Analytics parsing

### Integration Tests
- Account switching
- Import process
- Analytics fetching
- Comment creation

### E2E Tests
- Complete admin workflow
- Multi-account switching
- Import and publish flow

## Migration Path

1. Database migration adds new tables
2. Existing posts remain in `scheduled_posts`
3. Admin users need to register after deployment
4. Existing single account needs to be migrated

## Open Questions

1. Should we encrypt access tokens in database?
2. How to handle account conflicts (same Threads user added twice)?
3. Should analytics fetching be configurable per account?
4. Import file size limits?
5. How to handle rate limiting from Threads API?

## References

- Threads API Documentation: https://developers.facebook.com/docs/threads/
- Threads Insights API: https://developers.facebook.com/docs/threads/insights
- Express Session: https://github.com/expressjs/session
- bcrypt: https://github.com/kelektiv/node.bcrypt.js
