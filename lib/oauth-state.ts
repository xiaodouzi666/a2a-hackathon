import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const STATE_TTL_SECONDS = 10 * 60;

interface OAuthStatePayload {
  nonce: string;
  next: string;
  exp: number;
}

function getStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET ?? process.env.SECONDME_CLIENT_SECRET;
  if (!secret) {
    throw new Error('Missing required env: OAUTH_STATE_SECRET or SECONDME_CLIENT_SECRET');
  }
  return secret;
}

export function sanitizeNextPath(next: string | null): string {
  if (!next) return '/';
  return next.startsWith('/') ? next : '/';
}

function signPayload(payloadEncoded: string): string {
  return createHmac('sha256', getStateSecret()).update(payloadEncoded).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function createOAuthStateToken(nextPath: string): string {
  const payload: OAuthStatePayload = {
    nonce: randomUUID(),
    next: sanitizeNextPath(nextPath),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifyOAuthStateToken(token: string): { valid: boolean; nextPath: string } {
  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) {
    return { valid: false, nextPath: '/' };
  }

  const expected = signPayload(payloadEncoded);
  if (!safeEqual(signature, expected)) {
    return { valid: false, nextPath: '/' };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, nextPath: '/' };
    }
    return { valid: true, nextPath: sanitizeNextPath(payload.next) };
  } catch {
    return { valid: false, nextPath: '/' };
  }
}
