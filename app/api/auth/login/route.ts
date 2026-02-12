import { NextResponse } from 'next/server';
import { buildSecondMeAuthorizeUrl } from '@/lib/mindos';
import { createOAuthStateToken, sanitizeNextPath } from '@/lib/oauth-state';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const next = sanitizeNextPath(requestUrl.searchParams.get('next'));
    const state = createOAuthStateToken(next);

    const redirectUri = new URL('/api/auth/callback', requestUrl.origin).toString();
    const authUrl = buildSecondMeAuthorizeUrl({
        state,
        redirectUri,
        scope: 'user.info chat',
    });
    return NextResponse.redirect(authUrl);
}
