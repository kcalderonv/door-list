export const siteUrl = (() => {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? new URL(url.origin) : undefined;
  } catch {
    return undefined;
  }
})();
