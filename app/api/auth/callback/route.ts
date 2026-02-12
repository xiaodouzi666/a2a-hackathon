import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, getOAuthNextCookie, getOAuthStateCookie } from '@/lib/session';
import { exchangeCodeForToken, fetchSecondMeUserInfo } from '@/lib/mindos';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code/state' }, { status: 400 });
  }

  const expectedState = getOAuthStateCookie();
  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  try {
    const redirectUri = `${process.env.BASE_URL}/api/auth/callback`;
    const tokenData = await exchangeCodeForToken({ code, redirectUri });
    const userInfo = await fetchSecondMeUserInfo(tokenData.access_token);

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    const user = await prisma.user.upsert({
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

    const next = getOAuthNextCookie() || '/';
    const response = NextResponse.redirect(new URL(next, request.url));

    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set('a2a_oauth_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    response.cookies.set('a2a_oauth_next', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'OAuth callback failed' }, { status: 500 });
  }
}
