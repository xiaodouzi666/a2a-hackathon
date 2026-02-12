export function resolveAppOrigin(requestUrl: string): string {
  const configured = process.env.BASE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    return url.origin;
  }
  return new URL(requestUrl).origin;
}

export function buildOAuthCallbackUrl(requestUrl: string): string {
  const origin = resolveAppOrigin(requestUrl);
  return new URL('/api/auth/callback', origin).toString();
}
