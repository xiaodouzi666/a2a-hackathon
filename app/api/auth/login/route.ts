import { NextResponse } from 'next/server';
import { buildSecondMeAuthorizeUrl } from '@/lib/mindos';
import { createOAuthStateToken, sanitizeNextPath } from '@/lib/oauth-state';
import { buildOAuthCallbackUrl } from '@/lib/app-origin';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const next = sanitizeNextPath(requestUrl.searchParams.get('next'));
    const state = createOAuthStateToken(next);

    const redirectUri = buildOAuthCallbackUrl(request.url);
    const authUrl = buildSecondMeAuthorizeUrl({
        state,
        redirectUri,
        scope: 'user.info chat',
    });
    return NextResponse.redirect(authUrl);
}
