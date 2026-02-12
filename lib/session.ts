import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'a2a_user_id';

export function getSessionUserId(): string | null {
  return cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
}
