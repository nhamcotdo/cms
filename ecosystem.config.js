/**
 * PM2 Ecosystem Configuration
 * Process manager for Threads Admin Panel
 */

module.exports = {
    apps: [
        {
            name: 'threads-admin',
            script: './src/index.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 8000,
            },
            env_development: {
                NODE_ENV: 'development',
                PORT: 8000,
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_file: './logs/pm2-combined.log',
            time: true,
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};
