import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'a2a_user_id';
export const OAUTH_STATE_COOKIE_NAME = 'a2a_oauth_state';
export const OAUTH_NEXT_COOKIE_NAME = 'a2a_oauth_next';

export function getSessionUserId(): string | null {
  return cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function getOAuthStateCookie(): string | null {
  return cookies().get(OAUTH_STATE_COOKIE_NAME)?.value ?? null;
}

export function getOAuthNextCookie(): string | null {
  return cookies().get(OAUTH_NEXT_COOKIE_NAME)?.value ?? null;
}
