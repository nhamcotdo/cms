/**
 * Login API Route
 * Handles user authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, remember } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Please provide username and password' },
        { status: 400 }
      );
    }

    // Authenticate user
    const result = await authenticateUser(username, password, remember);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Create session
    const session = await createSession(result.user!.id, remember);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Set session cookie
    await setSessionCookie(session.session_token);

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
