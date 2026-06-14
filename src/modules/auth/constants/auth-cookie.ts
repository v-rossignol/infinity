import type { CookieOptions, Response } from 'express';

export const AUTH_COOKIE_NAME = 'infinity_token';
export const AUTH_COOKIE_PATH = '/infinity';
export const AUTH_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  const { httpOnly, path, sameSite, secure } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly, path, sameSite, secure });
}
