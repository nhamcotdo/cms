/**
 * Authentication Library for Next.js 15
 * Handles admin user authentication with sessions
 */

import { cookies } from 'next/headers';
import { AdminUsersModel, AdminSessionsModel } from '@/lib/db/models';
import type { AdminSession } from '@/lib/db/schema';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_EXPIRY_DAYS = 7;

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Get current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = AdminSessionsModel.findByToken(sessionToken);

  if (!session || session.expires_at < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const user = AdminUsersModel.findById(session.admin_user_id);

  if (!user || !user.is_active) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

/**
 * Authenticate user with username/email and password
 */
export async function authenticateUser(
  usernameOrEmail: string,
  password: string,
  _rememberMe: boolean = false
): Promise<AuthResult> {
  if (!usernameOrEmail || !password) {
    return {
      success: false,
      error: 'Please provide username and password',
    };
  }

  // Find user by username or email
  let user = AdminUsersModel.findByUsername(usernameOrEmail);
  if (!user) {
    user = AdminUsersModel.findByEmail(usernameOrEmail);
  }

  if (!user) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  if (!user.is_active) {
    return {
      success: false,
      error: 'Account is disabled',
    };
  }

  // Verify password
  const isValid = AdminUsersModel.verifyPassword(user, password);
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      created_at: user.created_at,
    },
  };
}

/**
 * Create session for authenticated user
 */
export async function createSession(
  userId: number,
  rememberMe: boolean = false
): Promise<AdminSession | null> {
  const sessionExpiry = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days
  return AdminSessionsModel.create(userId, sessionExpiry);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Delete current session
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    AdminSessionsModel.delete(sessionToken);
  }

  await clearSessionCookie();
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * Check if user is authenticated (doesn't throw)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Register a new user
 */
export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { username, email, password } = data;

  // Validation
  if (!username || !email || !password) {
    return {
      success: false,
      error: 'All fields are required',
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters',
    };
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: 'Invalid email address',
    };
  }

  // Check if username exists
  const existingUsername = AdminUsersModel.findByUsername(username);
  if (existingUsername) {
    return {
      success: false,
      error: 'Username already taken',
    };
  }

  // Check if email exists
  const existingEmail = AdminUsersModel.findByEmail(email);
  if (existingEmail) {
    return {
      success: false,
      error: 'Email already registered',
    };
  }

  // Create user
  const user = await AdminUsersModel.create({
    username,
    email,
    password,
  });

  if (!user) {
    return {
      success: false,
      error: 'Failed to create user',
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      created_at: user.created_at,
    },
  };
}

export { SESSION_COOKIE_NAME };
