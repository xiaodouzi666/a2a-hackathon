import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { exchangeCodeForToken, fetchSecondMeUserInfo } from '@/lib/mindos';
import { verifyOAuthStateToken } from '@/lib/oauth-state';
import { buildOAuthCallbackUrl } from '@/lib/app-origin';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code/state' }, { status: 400 });
  }

  const stateCheck = verifyOAuthStateToken(state);
  if (!stateCheck.valid) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  const redirectUri = buildOAuthCallbackUrl(request.url);

  let tokenData: Awaited<ReturnType<typeof exchangeCodeForToken>>;
  try {
    tokenData = await exchangeCodeForToken({ code, redirectUri });
  } catch (error) {
    const detail = getErrorMessage(error);
    console.error('OAuth token exchange error:', detail);
    return NextResponse.json(
      { error: 'OAuth token exchange failed', detail, redirectUri },
      { status: 500 },
    );
  }

  let userInfo: Awaited<ReturnType<typeof fetchSecondMeUserInfo>>;
  try {
    userInfo = await fetchSecondMeUserInfo(tokenData.access_token);
  } catch (error) {
    const detail = getErrorMessage(error);
    console.error('OAuth user info fetch error:', detail);
    return NextResponse.json(
      { error: 'OAuth user info failed', detail },
      { status: 500 },
    );
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  let user;
  try {
    user = await prisma.user.upsert({
      where: { mindosId: userInfo.id },
      update: {
        name: userInfo.name,
        avatar: userInfo.avatar,
        bio: userInfo.bio,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
      },
      create: {
        mindosId: userInfo.id,
        name: userInfo.name,
        avatar: userInfo.avatar,
        bio: userInfo.bio,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
      },
    });
  } catch (error) {
    const detail = getErrorMessage(error);
    console.error('OAuth user persist error:', detail);
    return NextResponse.json(
      { error: 'OAuth user persist failed', detail },
      { status: 500 },
    );
  }

  const response = NextResponse.redirect(new URL(stateCheck.nextPath, request.url));

  response.cookies.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
