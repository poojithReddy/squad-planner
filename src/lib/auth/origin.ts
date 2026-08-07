function normalizeOrigin(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).origin;
}

export function resolveApplicationOrigin(environment: {
  siteUrl?: string;
  publicVercelUrl?: string;
  vercelUrl?: string;
} = {}) {
  if (environment.siteUrl?.trim()) return normalizeOrigin(environment.siteUrl.trim());
  const vercelUrl = environment.publicVercelUrl?.trim() || environment.vercelUrl?.trim();
  if (vercelUrl) return normalizeOrigin(vercelUrl);
  return "http://localhost:3000";
}

export function applicationOrigin() {
  return resolveApplicationOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    publicVercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
}
