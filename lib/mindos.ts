import { createParser } from 'eventsource-parser';
import { prisma } from '@/lib/prisma';

const LAB_API_BASE = 'https://app.mindos.com/gate/lab/api';
const OAUTH_AUTHORIZE_URL = 'https://go.second.me/oauth/';

const DEFAULT_SCOPE = 'user.info chat';

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string | string[];
  token_type?: string;
}

export interface SecondMeUserInfo {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface StreamChatOptions {
  accessToken: string;
  sessionId: string;
  userPrompt: string;
  systemPrompt?: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function buildTokenForm(data: Record<string, string>) {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => form.set(key, value));
  return form.toString();
}

function normalizeTokenResponse(raw: unknown): OAuthTokenResponse | null {
  const root = raw as Record<string, unknown> | null;
  if (!root || typeof root !== 'object') {
    return null;
  }

  const payload = (root.data as Record<string, unknown>) ?? root;
  const accessToken =
    payload.access_token ??
    payload.accessToken;

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return null;
  }

  const refreshToken = payload.refresh_token ?? payload.refreshToken;
  const expiresIn = payload.expires_in ?? payload.expiresIn;
  const scope = payload.scope;
  const tokenType = payload.token_type ?? payload.tokenType;
  const parsedExpiresIn =
    typeof expiresIn === 'number'
      ? expiresIn
      : typeof expiresIn === 'string' && expiresIn.trim() !== ''
        ? Number(expiresIn)
        : undefined;

  return {
    access_token: accessToken,
    refresh_token: typeof refreshToken === 'string' ? refreshToken : undefined,
    expires_in: typeof parsedExpiresIn === 'number' && !Number.isNaN(parsedExpiresIn) ? parsedExpiresIn : undefined,
    scope: typeof scope === 'string' || Array.isArray(scope) ? (scope as string | string[]) : undefined,
    token_type: typeof tokenType === 'string' ? tokenType : undefined,
  };
}

function isBusinessSuccess(raw: unknown): boolean {
  const root = raw as Record<string, unknown> | null;
  if (!root || typeof root !== 'object') return true;
  if (!('code' in root)) return true;
  return root.code === 0 || root.code === '0';
}

export function buildSecondMeAuthorizeUrl(params: {
  state: string;
  redirectUri: string;
  scope?: string;
}) {
  const clientId = requiredEnv('SECONDME_CLIENT_ID');
  const scope = params.scope ?? DEFAULT_SCOPE;
  const url = new URL(OAUTH_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
}): Promise<OAuthTokenResponse> {
  const response = await fetch(`${LAB_API_BASE}/oauth/token/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildTokenForm({
      grant_type: 'authorization_code',
      client_id: requiredEnv('SECONDME_CLIENT_ID'),
      client_secret: requiredEnv('SECONDME_CLIENT_SECRET'),
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  });

  const data = await response.json();
  const normalized = normalizeTokenResponse(data);
  if (!response.ok || !isBusinessSuccess(data) || !normalized) {
    throw new Error(`Token exchange failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return normalized;
}

export async function refreshSecondMeToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const response = await fetch(`${LAB_API_BASE}/oauth/token/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildTokenForm({
      grant_type: 'refresh_token',
      client_id: requiredEnv('SECONDME_CLIENT_ID'),
      client_secret: requiredEnv('SECONDME_CLIENT_SECRET'),
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  const normalized = normalizeTokenResponse(data);
  if (!response.ok || !isBusinessSuccess(data) || !normalized) {
    throw new Error(`Token refresh failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return normalized;
}

export async function fetchSecondMeUserInfo(accessToken: string): Promise<SecondMeUserInfo> {
  const response = await fetch(`${LAB_API_BASE}/secondme/user/info`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`user/info failed: ${response.status} ${JSON.stringify(data)}`);
  }

  const payload = data.data ?? data;
  const id = payload.id ?? payload.userId ?? payload.uid;
  if (!id) {
    throw new Error(`Invalid user/info payload: ${JSON.stringify(data)}`);
  }

  return {
    id: String(id),
    name: String(payload.name ?? payload.nickname ?? 'SecondMe User'),
    avatar: payload.avatar ?? payload.avatarUrl,
    bio: payload.bio ?? payload.intro,
  };
}

function extractTextChunk(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed === 'string') {
      return parsed;
    }

    const chunk =
      parsed.choices?.[0]?.delta?.content ??
      parsed.choices?.[0]?.message?.content ??
      parsed.data?.content ??
      parsed.content ??
      parsed.text ??
      parsed.delta ??
      '';

    if (typeof chunk === 'string') {
      return chunk;
    }
    return '';
  } catch {
    // Some streams may send plain text frames.
    return raw;
  }
}

export async function streamSecondMeChat(options: StreamChatOptions): Promise<string> {
  const body: Record<string, unknown> = {
    sessionId: options.sessionId,
    stream: true,
    messages: [{ role: 'user', content: options.userPrompt }],
  };

  if (options.systemPrompt) {
    body.systemPrompt = options.systemPrompt;
  }

  const response = await fetch(`${LAB_API_BASE}/secondme/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`chat/stream failed: ${response.status} ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('chat/stream missing response body');
  }

  let fullText = '';
  const parser = createParser({
    onEvent(event) {
      if (event.data === '[DONE]') {
        return;
      }
      fullText += extractTextChunk(event.data);
    },
  });

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value));
  }

  return fullText.trim();
}

function getExpiryDate(expiresInSeconds?: number): Date | null {
  if (!expiresInSeconds || Number.isNaN(expiresInSeconds)) return null;
  return new Date(Date.now() + expiresInSeconds * 1000);
}

export async function persistUserTokens(params: {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}) {
  await prisma.user.update({
    where: { id: params.userId },
    data: {
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenExpiresAt: getExpiryDate(params.expiresIn),
    },
  });
}

export async function getValidUserAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
  });

  if (!user || !user.accessToken) {
    throw new Error('User access token not found');
  }

  const expiry = user.tokenExpiresAt?.getTime() ?? 0;
  const shouldRefresh = Boolean(user.refreshToken && expiry && expiry - Date.now() <= 60_000);

  if (!shouldRefresh) {
    return user.accessToken;
  }

  const refreshed = await refreshSecondMeToken(user.refreshToken!);

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? user.refreshToken,
      tokenExpiresAt: getExpiryDate(refreshed.expires_in),
    },
  });

  return refreshed.access_token;
}
