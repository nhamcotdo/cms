import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import { getCurrentUser } from '@/lib/auth';
import { AccountsModel } from '@/lib/db/models';

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
});

const GRAPH_API_BASE_URL = `https://graph.threads.net/${process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : ''}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/admin/auth/login', request.url));
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      new URL('oauth/access_token', GRAPH_API_BASE_URL).toString(),
      new URLSearchParams({
        client_id: process.env.APP_ID || '',
        client_secret: process.env.API_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: process.env.REDIRECT_URI || '',
        code,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: agent,
      }
    );

    let accessToken = tokenResponse.data.access_token;

    // Extend token
    try {
      const extendResponse = await axios.get(
        new URL(`access_token?grant_type=th_exchange_token&client_secret=${process.env.API_SECRET}`, GRAPH_API_BASE_URL).toString() + `&access_token=${accessToken}`,
        { httpsAgent: agent }
      );
      accessToken = extendResponse.data.access_token;
    } catch (e) {
      console.error('Error extending token:', e);
    }

    // Fetch user details
    const userResponse = await axios.get(
      new URL(`me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`, GRAPH_API_BASE_URL).toString(),
      { httpsAgent: agent }
    );

    const threadsUserId = userResponse.data.id;
    const username = userResponse.data.username;

    // Get logged-in admin user
    const currentUser = await getCurrentUser();
    let adminUserId = currentUser?.id || null;

    // Check if account already exists
    let account = AccountsModel.findByThreadsUserId(threadsUserId);

    if (account) {
      // Update existing account
      account = AccountsModel.update(account.id, {
        access_token: accessToken,
        username,
        threads_profile_picture_url: userResponse.data.threads_profile_picture_url,
        threads_biography: userResponse.data.threads_biography,
        admin_user_id: adminUserId ?? undefined,
      });
    } else {
      // Create new account
      account = AccountsModel.create({
        threads_user_id: threadsUserId,
        username,
        threads_profile_picture_url: userResponse.data.threads_profile_picture_url,
        threads_biography: userResponse.data.threads_biography,
        access_token: accessToken,
        admin_user_id: adminUserId ?? undefined,
      });
    }

    // Set as current account (via cookie in redirect)
    const redirectUrl = new URL('/admin/platforms', request.url);
    if (account) {
      redirectUrl.searchParams.set('account_id', String(account.id));
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/admin/auth/login?error=oauth_failed', request.url));
  }
}
