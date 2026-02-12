import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { buildSecondMeAuthorizeUrl } from '@/lib/mindos';
import { OAUTH_NEXT_COOKIE_NAME, OAUTH_STATE_COOKIE_NAME } from '@/lib/session';

export async function GET(request: Request) {
    const state = randomUUID();
    const { searchParams } = new URL(request.url);
    const next = searchParams.get('next') || '/';

    const redirectUri = `${process.env.BASE_URL}/api/auth/callback`;
    const authUrl = buildSecondMeAuthorizeUrl({
        state,
        redirectUri,
        scope: 'user.info chat',
    });
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60,
    });
    response.cookies.set(OAUTH_NEXT_COOKIE_NAME, next.startsWith('/') ? next : '/', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60,
    });
    return response;
}
