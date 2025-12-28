import { NextRequest, NextResponse } from 'next/server';
import { URL } from 'url';

const SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_insights',
  'threads_manage_replies',
  'threads_read_replies',
  'threads_keyword_search',
  'threads_manage_mentions',
  'threads_delete',
  'threads_location_tagging',
  'threads_profile_discovery',
];

const AUTHORIZATION_BASE_URL = 'https://www.threads.net';

export async function GET(_request: NextRequest) {
  const url = new URL('oauth/authorize', AUTHORIZATION_BASE_URL);
  url.searchParams.append('scope', SCOPES.join(','));
  url.searchParams.append('client_id', process.env.APP_ID || '');
  url.searchParams.append('redirect_uri', process.env.REDIRECT_URI || '');
  url.searchParams.append('response_type', 'code');

  return NextResponse.redirect(url);
}
