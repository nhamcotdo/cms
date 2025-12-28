/**
 * Database Layer Test
 * Run with: npx tsx lib/db/__tests__/database.test.ts
 */

import { initializeDatabase, getDb, closeDatabase } from '../index';
import {
  ScheduledPostsModel,
  AccountsModel,
  AdminUsersModel,
  MediaFilesModel,
  UserSettingsModel,
  POST_STATUS,
} from '../models';

async function testDatabase() {
  console.log('=== Testing Database Layer ===\n');

  try {
    // Initialize database
    console.log('1. Initializing database...');
    initializeDatabase();
    console.log('✓ Database initialized\n');

    // Test UserSettings
    console.log('2. Testing UserSettingsModel...');
    const schedulerEnabled = UserSettingsModel.set('test_setting', 'true');
    console.log(`✓ Set test_setting: ${schedulerEnabled}`);
    const retrieved = UserSettingsModel.get('test_setting');
    console.log(`✓ Retrieved test_setting: ${retrieved}\n`);

    // Test AdminUsers
    console.log('3. Testing AdminUsersModel...');
    const existingAdmin = await AdminUsersModel.findByUsername('test_admin');
    let adminId: number;

    if (existingAdmin) {
      adminId = existingAdmin.id;
      console.log(`✓ Found existing admin: ${adminId}`);
    } else {
      const newAdmin = await AdminUsersModel.create({
        username: 'test_admin',
        email: 'test@example.com',
        password: 'testpassword123',
        is_active: true,
      });
      adminId = newAdmin!.id;
      console.log(`✓ Created test admin: ${adminId}`);
    }
    console.log();

    // Test Accounts
    console.log('4. Testing AccountsModel...');
    const existingAccount = AccountsModel.findByThreadsUserId('test_threads_id');
    let accountId: number;

    if (existingAccount) {
      accountId = existingAccount.id;
      console.log(`✓ Found existing account: ${accountId}`);
    } else {
      const newAccount = AccountsModel.create({
        threads_user_id: 'test_threads_id',
        username: 'testuser',
        threads_profile_picture_url: 'https://example.com/avatar.jpg',
        access_token: 'test_token',
        admin_user_id: adminId,
      });
      accountId = newAccount!.id;
      console.log(`✓ Created test account: ${accountId}`);
    }
    console.log();

    // Test ScheduledPosts
    console.log('5. Testing ScheduledPostsModel...');
    const scheduledFor = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const newPost = ScheduledPostsModel.create({
      text: 'Test post from TypeScript database layer',
      scheduled_for: scheduledFor,
      account_id: accountId,
      status: POST_STATUS.SCHEDULED,
    });
    console.log(`✓ Created scheduled post: ${newPost?.id}`);

    if (newPost) {
      // Find by ID
      const foundPost = ScheduledPostsModel.findById(newPost.id);
      console.log(`✓ Found post by ID: ${foundPost?.text}`);

      // Update
      const updatedPost = ScheduledPostsModel.update(newPost.id, {
        status: POST_STATUS.PUBLISHED,
      });
      console.log(`✓ Updated post status: ${updatedPost?.status}`);

      // Find all
      const allPosts = ScheduledPostsModel.findAll({ limit: 5 });
      console.log(`✓ Found ${allPosts.length} posts`);

      // Cleanup
      ScheduledPostsModel.delete(newPost.id);
      console.log(`✓ Deleted test post: ${newPost.id}`);
    }
    console.log();

    // Test MediaFiles
    console.log('6. Testing MediaFilesModel...');
    const testMedia = MediaFilesModel.create({
      filename: 'test_image.jpg',
      original_name: 'test_image.jpg',
      mime_type: 'image/jpeg',
      file_size: 12345,
      file_path: '/uploads/test_image.jpg',
      url: 'http://localhost:3000/uploads/test_image.jpg',
      alt_text: 'Test image',
    });
    console.log(`✓ Created media file: ${testMedia?.id}`);

    if (testMedia) {
      // Find by filename
      const foundMedia = MediaFilesModel.findByFilename('test_image.jpg');
      console.log(`✓ Found media by filename: ${foundMedia?.filename}`);

      // Get count
      const count = MediaFilesModel.count();
      console.log(`✓ Total media files: ${count}`);

      // Cleanup
      MediaFilesModel.delete(testMedia.id);
      console.log(`✓ Deleted test media: ${testMedia.id}`);
    }
    console.log();

    // Test queries
    console.log('7. Testing complex queries...');
    const activeAccounts = AccountsModel.findAll({ is_active: true });
    console.log(`✓ Found ${activeAccounts.length} active accounts`);

    const accountPosts = ScheduledPostsModel.findByAccountId(accountId);
    console.log(`✓ Found ${accountPosts.length} posts for account ${accountId}`);

    const duePosts = ScheduledPostsModel.getDuePosts();
    console.log(`✓ Found ${duePosts.length} posts due for publishing`);
    console.log();

    console.log('=== All Tests Passed! ===');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Close database
    closeDatabase();
    console.log('\n✓ Database connection closed');
  }
}

// Run tests
testDatabase();
