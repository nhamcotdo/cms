# Threads Admin Panel

A full-featured admin panel for managing Threads API posts with scheduling, media management, and analytics.

## Features

- **Dashboard**: Overview with statistics on scheduled, draft, published, and failed posts
- **Create Post**: Compose posts with text, images, videos, and attachments
- **Image Upload**: Drag-and-drop file upload with local storage
- **Post Scheduling**: Schedule posts for future publication with automatic background processing
- **Scheduled Posts Management**: View, edit, delete, and publish scheduled posts
- **Post History**: Track all published posts with links to Threads
- **Media Library**: Manage uploaded images and videos
- **Real-time Publishing**: Background scheduler automatically publishes posts at scheduled time
- **Retry Logic**: Failed posts are automatically retried up to 3 times

## New Directory Structure

```
threads_api/
├── src/
│   ├── config/
│   │   └── multer.js              # Multer configuration for file uploads
│   ├── database/
│   │   ├── init.js                # Database initialization
│   │   ├── models.js              # Database models (CRUD operations)
│   │   └── schema.sql             # Database schema
│   ├── routes/
│   │   └── admin.js               # Admin panel routes
│   ├── services/
│   │   └── scheduler.js           # Background post scheduler
│   └── index.js                   # Main application file (updated)
├── views/
│   └── admin/
│       ├── layout.pug             # Admin panel layout with sidebar
│       ├── dashboard.pug          # Dashboard overview
│       ├── create-post.pug        # Create/edit post page
│       ├── scheduled-posts.pug    # Scheduled posts management
│       ├── post-history.pug       # Post history log
│       └── media-library.pug      # Media library management
├── public/
│   ├── css/
│   │   └── admin/
│   │       └── admin.css          # Admin panel styles
│   └── uploads/                   # Uploaded media files
├── uploads/                       # Upload directory (created automatically)
└── threads_admin.db              # SQLite database (created automatically)
```

## Database Schema

### Scheduled Posts
- `id`: Primary key
- `text`: Post text content
- `media_type`: TEXT, IMAGE, VIDEO, or CAROUSEL
- `scheduled_for`: Unix timestamp for scheduled publication
- `status`: draft, scheduled, publishing, published, or failed
- `container_id`: Threads API container ID
- `thread_id`: Published thread ID
- `attachment_data`: JSON data for attachments
- `reply_control`: Reply permission settings
- `reply_to_id`: If this is a reply
- `link_attachment`: URL attachment
- `topic_tag`: Topic tag
- `quote_post_id`: Quoted post ID
- `is_spoiler_media`: Boolean flag
- `poll_attachment`: Poll data
- `text_entities`: Text entity data
- `retry_count`: Number of retry attempts
- `error_message`: Last error message
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `published_at`: Publication timestamp

### Media Files
- `id`: Primary key
- `filename`: Unique filename
- `original_name`: Original filename
- `mime_type`: File MIME type
- `file_size`: File size in bytes
- `file_path`: Local file path
- `url`: URL to access file
- `alt_text`: Alt text for accessibility
- `uploaded_at`: Upload timestamp

### Post History
- `id`: Primary key
- `container_id`: Threads API container ID
- `thread_id`: Published thread ID
- `text`: Post text
- `media_type`: Media type
- `status`: Publication status
- `published_at`: Publication timestamp
- `attachment_data`: Attachment data
- `created_at`: Record creation timestamp

### User Settings
- `id`: Primary key
- `key`: Setting key
- `value`: Setting value
- `updated_at`: Last update timestamp

## Setup Instructions

### 1. Install Dependencies

Dependencies have already been installed:
```bash
npm install better-sqlite3 node-cron
```

### 2. Configure Environment Variables

Ensure your `.env` file has the required variables:
```env
HOST=localhost
PORT=443
REDIRECT_URI=https://localhost/callback
APP_ID=your_app_id
API_SECRET=your_api_secret
GRAPH_API_VERSION=v1.0
SESSION_SECRET=your_session_secret
# Optional: Initial access token for development
INITIAL_ACCESS_TOKEN=your_initial_token
INITIAL_USER_ID=your_user_id
REJECT_UNAUTHORIZED=false
```

### 3. Start the Application

```bash
npm start
```

On first start, the application will:
- Create the `uploads/` directory if it doesn't exist
- Create `threads_admin.db` SQLite database
- Initialize database schema
- Start the background scheduler

### 4. Access the Admin Panel

1. Navigate to `https://localhost` (or your configured HOST/PORT)
2. Complete OAuth authentication (or use initial credentials if configured)
3. You'll be redirected to the dashboard at `/admin/dashboard`

## Usage Guide

### Creating a Post

1. Click "Create Post" in the sidebar
2. Enter your post text
3. Optionally add images/videos:
   - Click the upload area or drag files
   - Files are uploaded to `/uploads/` and stored in database
4. Configure optional settings:
   - Schedule date/time (or save as draft)
   - Reply control permissions
   - Topic tag
   - Link attachment
   - Mark as spoiler
5. Click "Save as Draft" or "Schedule Post"

### Managing Scheduled Posts

1. Navigate to "Scheduled Posts"
2. View all scheduled and draft posts
3. Actions available:
   - **Publish Now**: Immediately publish the post
   - **Edit**: Modify post content and scheduling
   - **Delete**: Remove the post

### Viewing Post History

1. Navigate to "Post History"
2. See all published posts with:
   - Post text preview
   - Media type
   - Publication date
   - Link to Threads (click thread_id)

### Managing Media Library

1. Navigate to "Media Library"
2. View all uploaded images and videos
3. Delete unused media files

## How the Scheduler Works

1. The scheduler runs as a background cron job (every minute)
2. It checks for posts with `status='scheduled'` and `scheduled_for <= now`
3. For each due post:
   - Updates status to 'publishing'
   - Creates a Threads API container
   - Publishes the container
   - Updates status to 'published' with thread_id
   - Creates a record in post history
4. On failure:
   - Increments retry_count
   - If retry_count < 3, keeps status as 'scheduled' for retry
   - If retry_count >= 3, sets status to 'failed'
   - Stores error message

## API Routes

### Dashboard
- `GET /admin/dashboard` - View dashboard with statistics

### Create Post
- `GET /admin/create` - Display create post form
- `POST /admin/upload/file` - Upload media file
- `POST /admin/save` - Save post as draft or schedule

### Scheduled Posts
- `GET /admin/scheduled` - View all scheduled/draft posts
- `GET /admin/scheduled/:id/edit` - Edit specific post
- `PUT /admin/scheduled/:id` - Update post
- `DELETE /admin/scheduled/:id` - Delete post
- `POST /admin/scheduled/:id/publish` - Publish immediately

### Post History
- `GET /admin/history` - View post history

### Media Library
- `GET /admin/media` - View media library
- `DELETE /admin/media/:id` - Delete media file

## File Upload Configuration

Located in `/Users/nhamcotdo/mmo/threads_api/src/config/multer.js`:

- **Max file size**: 10MB
- **Allowed types**: JPEG, PNG, GIF, WebP, MP4, QuickTime
- **Storage**: Local `/uploads/` directory
- **Filename**: Unique random hex string + original extension

## Database Backup/Restore

### Backup
```bash
cp threads_admin.db threads_admin.db.backup
```

### Restore
```bash
cp threads_admin.db.backup threads_admin.db
```

## Troubleshooting

### Scheduler not running
- Check console for "Scheduler started" message
- Verify access token is set in session
- Ensure database is initialized

### File upload failing
- Check file size (max 10MB)
- Verify file type is allowed
- Ensure `/uploads/` directory exists and is writable

### Posts not publishing
- Check scheduler is running
- Verify access token is valid
- Check post status and error_message in database
- View console logs for detailed errors

### Database locked error
- Ensure only one instance is running
- Check file permissions on `threads_admin.db`

## Security Considerations

1. **File uploads**: Files are validated for type and size
2. **Access control**: All admin routes require authentication
3. **SQL injection**: Using parameterized queries with better-sqlite3
4. **Session management**: Express sessions with secure cookies
5. **HTTPS**: Application runs on HTTPS by default

## Future Enhancements

Potential improvements for the admin panel:

1. **Bulk actions**: Schedule/delete multiple posts at once
2. **Post templates**: Save and reuse post templates
3. **Analytics dashboard**: Detailed engagement analytics
4. **Multi-account support**: Manage multiple Threads accounts
5. **Hashtag suggestions**: Auto-suggest trending hashtags
6. **Image editing**: Basic image editing before upload
7. **CSV import**: Bulk upload scheduled posts from CSV
8. **Webhook notifications**: Get notified on publish success/failure
9. **Post preview**: Preview how post will look on Threads
10. **Calendar view**: Visual calendar for scheduled posts

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify database state using SQLite browser
3. Review Threads API documentation at https://developers.facebook.com/docs/threads/

---

**Note**: This admin panel maintains full compatibility with the existing Threads API Sample App features. All original routes and functionality remain intact.
