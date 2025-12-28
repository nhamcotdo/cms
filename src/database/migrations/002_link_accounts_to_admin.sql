-- Add admin_user_id to accounts table
-- This links Threads accounts to specific admin users

ALTER TABLE accounts ADD COLUMN admin_user_id INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_admin_user_id ON accounts(admin_user_id);

-- Add foreign key constraint
-- Note: SQLite doesn't support adding foreign keys to existing tables easily
-- So we'll handle this at application level
