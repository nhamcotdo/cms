# Threads Admin Panel

> Admin panel for managing Threads API - Schedule posts, manage multiple accounts, analytics, and more.

## Features

- **Multi-Account Management**: Connect and manage multiple Threads accounts
- **Post Scheduling**: Create and schedule posts for automatic publishing
- **Media Support**: Upload images and videos with your posts
- **Bulk Import**: Import posts from CSV/JSON files
- **Analytics**: Track engagement metrics (likes, comments, shares)
- **Comments Management**: View and manage post comments
- **Post History**: Track all published posts
- **Modern UI**: Neo-Brutalist Tech Dashboard design

## Requirements

- Node.js 18.x or higher
- npm or yarn
- PM2 (for production deployment)

## Quick Start

### Option 1: Automated Installation (Recommended)

Run the installation script:

```bash
./install.sh
```

The script will:
- Check and install dependencies
- Create `.env` file from `.env.example`
- Set up necessary directories
- Guide you through Threads App credentials setup

### Option 2: Manual Installation

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your Threads App credentials:
- `THREADS_APP_ID`: Get from [Meta for Developers](https://developers.facebook.com/apps/)
- `THREADS_APP_SECRET`: Get from app dashboard
- `THREADS_REDIRECT_URI`: Your callback URL (e.g., `http://localhost:8000/login`)

3. **Create admin user**

The first time you access the admin panel, you'll be prompted to create an admin account.

4. **Start the application**

```bash
# Development
npm run dev

# Production with PM2
pm2 start ecosystem.config.js
pm2 save
```

5. **Access the panel**

Open http://localhost:8000/admin/auth/login in your browser.

## Threads App Setup

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Create a new app
3. Select "Threads" as the use case
4. Add "Threads API" product
5. Copy your App ID and App Secret to `.env`
6. Add your redirect URI to app settings

## Directory Structure

```
threads_api/
├── src/
│   ├── database/        # Database models and migrations
│   ├── routes/          # Express routes
│   ├── services/        # Business logic (scheduler, analytics, etc.)
│   ├── middleware/      # Express middleware
│   └── index.js         # Application entry point
├── views/
│   └── admin/           # Pug templates for admin panel
├── public/
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JavaScript
│   └── img/             # Images and logos
├── logs/                # Application logs
└── threads_admin.db     # SQLite database
```

## PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Restart application
pm2 restart threads-admin

# Stop application
pm2 stop threads-admin

# View logs
pm2 logs threads-admin

# Monitor
pm2 monit

# Save process list
pm2 save

# Startup on boot
pm2 startup
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: localhost)
- `THREADS_APP_ID`: Your Threads app ID
- `THREADS_APP_SECRET`: Your Threads app secret
- `THREADS_REDIRECT_URI`: OAuth redirect URI
- `SESSION_SECRET`: Random string for session encryption
- `NODE_ENV`: development or production

## Database

This application uses SQLite for data storage.

Database file: `threads_admin.db`

Tables:
- `accounts` - Threads accounts
- `admin_users` - Admin users
- `admin_sessions` - Active sessions
- `scheduled_posts` - Scheduled/published posts
- `media_files` - Uploaded media
- `post_history` - Published post history
- `post_analytics` - Engagement metrics
- `post_comments` - Post comments
- `bulk_imports` - Bulk import records

## Troubleshooting

### Scheduler not running

Check if the scheduler is initialized:
```bash
pm2 logs threads-admin | grep "Scheduler"
```

Should see: "Scheduler started - checking every minute"

### Posts not publishing

1. Check post has `account_id` set
2. Verify account has valid `access_token`
3. Check post `scheduled_for` timestamp is in the past
4. Check logs for errors: `pm2 logs threads-admin`

### Database errors

If you see migration errors, the database schema may be out of sync. Backup and reinitialize:
```bash
cp threads_admin.db threads_admin.db.backup
rm threads_admin.db
pm2 restart threads-admin
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a reverse proxy (nginx) for SSL
3. Configure proper logging
4. Set up monitoring with PM2
5. Configure automatic backups

## Security

- Use strong `SESSION_SECRET`
- Enable HTTPS in production
- Keep `THREADS_APP_SECRET` secure
- Regularly update dependencies
- Use firewall to restrict database access

## License

Threads API is Meta Platform Policy licensed, as found in the LICENSE file.

## Support

For Threads API documentation: https://developers.facebook.com/docs/threads
