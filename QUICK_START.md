# Quick Start Guide - Threads Admin Panel

## Installation Complete

All dependencies installed:
- better-sqlite3
- node-cron

## Start the Application

```bash
cd /Users/nhamcotdo/mmo/threads_api
npm start
```

## Access the Admin Panel

1. Open browser: `https://localhost` (or your configured HOST)
2. Complete OAuth login (or use INITIAL_ACCESS_TOKEN from .env)
3. Redirect to: `/admin/dashboard`

## First Time Setup

### Directory Structure
These are created automatically:
- `/uploads/` - Stores uploaded media files
- `threads_admin.db` - SQLite database
- Logs in console showing initialization

### Verify Database
```bash
sqlite3 threads_admin.db ".tables"
# Should show: media_files, post_history, scheduled_posts, user_settings
```

## Basic Usage

### Create a Post
1. Navigate to **Create Post** in sidebar
2. Enter post text
3. Click upload area to add images/videos
4. (Optional) Set schedule date/time
5. Click **Schedule Post** or **Save as Draft**

### Manage Scheduled Posts
1. Navigate to **Scheduled Posts**
2. View all drafts and scheduled posts
3. Actions:
   - **Publish Now** - Immediately publish
   - **Edit** - Modify content/schedule
   - **Delete** - Remove post

### View Published Posts
1. Navigate to **Post History**
2. See all published posts with Threads links
3. Click thread_id to view on Threads

### Manage Media
1. Navigate to **Media Library**
2. View all uploaded images/videos
3. Delete unused files

## URL Reference

| Page | URL |
|------|-----|
| Dashboard | `/admin/dashboard` |
| Create Post | `/admin/create` |
| Scheduled Posts | `/admin/scheduled` |
| Post History | `/admin/history` |
| Media Library | `/admin/media` |
| My Account | `/account` |
| Logout | `/logout` |

## File Locations

| File | Path |
|------|------|
| Database | `/Users/nhamcotdo/mmo/threads_api/threads_admin.db` |
| Uploads | `/Users/nhamcotdo/mmo/threads_api/uploads/` |
| Schema | `/Users/nhamcotdo/mmo/threads_api/src/database/schema.sql` |
| Models | `/Users/nhamcotdo/mmo/threads_api/src/database/models.js` |
| Scheduler | `/Users/nhamcotdo/mmo/threads_api/src/services/scheduler.js` |
| Admin Routes | `/Users/nhamcotdo/mmo/threads_api/src/routes/admin.js` |
| Styles | `/Users/nhamcotdo/mmo/threads_api/public/css/admin/admin.css` |

## Common Commands

### Check Database
```bash
sqlite3 threads_admin.db "SELECT * FROM scheduled_posts WHERE status = 'scheduled';"
```

### Backup Database
```bash
cp threads_admin.db threads_admin.db.backup
```

### View Scheduled Posts
```bash
sqlite3 threads_admin.db "SELECT id, text, datetime(scheduled_for, 'unixepoch') as scheduled_date FROM scheduled_posts;"
```

### Check Failed Posts
```bash
sqlite3 threads_admin.db "SELECT id, text, error_message FROM scheduled_posts WHERE status = 'failed';"
```

### Count Media Files
```bash
sqlite3 threads_admin.db "SELECT COUNT(*) FROM media_files;"
```

## Troubleshooting

### Port Already in Use
```bash
# Kill existing process
lsof -ti:443 | xargs kill -9
```

### Database Locked
```bash
# Only one instance can run at a time
# Stop other instances before starting
```

### Uploads Directory Missing
```bash
mkdir -p uploads
chmod 755 uploads
```

### Reset Database
```bash
rm threads_admin.db
# Will recreate on next restart
```

## Features

- Post scheduling with date/time picker
- Image/video upload with preview
- Draft saving for later
- Automatic background publishing
- Post history with Threads links
- Media library management
- Status tracking (draft, scheduled, published, failed)
- Retry logic for failed posts
- Real-time statistics on dashboard

## Status Meanings

| Status | Description |
|--------|-------------|
| draft | Saved but not scheduled |
| scheduled | Set to publish at future time |
| publishing | Currently being published |
| published | Successfully published |
| failed | Failed after 3 retry attempts |

## Scheduler Information

- **Runs**: Every minute
- **Checks**: Posts with status='scheduled' and scheduled_for <= now
- **Action**: Creates container, publishes, updates status
- **Retry**: Up to 3 attempts on failure
- **Logging**: All actions logged to console

## File Upload Limits

- **Max size**: 10MB per file
- **Types**: JPEG, PNG, GIF, WebP, MP4, QuickTime
- **Storage**: Local filesystem
- **Naming**: Unique random filename

## Support

For detailed documentation, see:
- `/Users/nhamcotdo/mmo/threads_api/README_ADMIN.md`
- `/Users/nhamcotdo/mmo/threads_api/IMPLEMENTATION_SUMMARY.md`

---

**Ready to use! Start creating and scheduling your Threads posts.**
