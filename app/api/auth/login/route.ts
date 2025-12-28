import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    // TODO: Implement actual authentication with database
    // For now, basic validation
    if (!username || !password) {
      return NextResponse.redirect(
        new URL('/login?error=missing', request.url)
      );
    }

    // TODO: Verify credentials against database
    // TODO: Create session token
    // TODO: Set secure cookie

    // Temporary redirect to dashboard
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'temp-session-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.redirect(
      new URL('/login?error=server', request.url)
    );
  }
}
