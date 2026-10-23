import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * Cross-Subdomain Session & Token Sync Helper for *.bikinkilat.web.id
 * Anti-Crash Resilient Storage Adapter (Prevents URIError: URI malformed)
 */

const SESSION_COOKIE_NAME = "bikinkilat_session";
const TOKEN_COOKIE_NAME = "bikinkilat_token_cache";

export function getCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname;
  if (hostname.endsWith("bikinkilat.web.id")) {
    return ".bikinkilat.web.id";
  }
  return undefined; // Localhost development
}

/**
 * Safe URI decoder that never throws on invalid/truncated percent sequences
 */
export function safeDecodeURIComponent(val: string): string {
  if (!val) return "";
  try {
    return decodeURIComponent(val);
  } catch {
    // If decoding fails (e.g. malformed or partial percent), return raw string
    return val;
  }
}

/**
 * Custom storage adapter for Supabase client to sync session across *.bikinkilat.web.id
 */
export const crossSubdomainStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null;

    // Parse raw cookies without premature decoding so chunk boundaries don't break
    const rawCookies = document.cookie.split(";").reduce((acc, c) => {
      const idx = c.indexOf("=");
      if (idx > -1) {
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        acc[k] = v;
      }
      return acc;
    }, {} as Record<string, string>);

    // 1. Direct cookie check
    if (rawCookies[key]) {
      return safeDecodeURIComponent(rawCookies[key]);
    }

    // 2. Chunked cookies check (assemble all slices before decoding)
    if (rawCookies[`${key}.0`]) {
      let full = "";
      let i = 0;
      while (rawCookies[`${key}.${i}`]) {
        full += rawCookies[`${key}.${i}`];
        i++;
      }
      return safeDecodeURIComponent(full);
    }

    // 3. Fallback to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {}

    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof document === "undefined") return;
    const domain = getCookieDomain();
    const domainStr = domain ? `; Domain=${domain}` : "";
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    const secureStr = isSecure ? "; Secure" : "";
    const maxAge = 60 * 60 * 24 * 30; // 30 days

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}

    const encoded = encodeURIComponent(value);
    const CHUNK_SIZE = 3000;

    if (encoded.length <= CHUNK_SIZE) {
      document.cookie = `${key}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;
      document.cookie = `${key}.0=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
      document.cookie = `${key}.1=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
    } else {
      document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
      let offset = 0;
      let i = 0;
      while (offset < encoded.length) {
        const chunk = encoded.slice(offset, offset + CHUNK_SIZE);
        document.cookie = `${key}.${i}=${chunk}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;
        offset += CHUNK_SIZE;
        i++;
      }
    }
  },

  removeItem: (key: string): void => {
    if (typeof document === "undefined") return;
    const domain = getCookieDomain();
    const domainStr = domain ? `; Domain=${domain}` : "";
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    const secureStr = isSecure ? "; Secure" : "";

    document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
    for (let i = 0; i < 5; i++) {
      document.cookie = `${key}.${i}=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
  },
};

export function setSharedSessionCookie(userId: string, tokens: number): void {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const domainStr = domain ? `; Domain=${domain}` : "";
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureStr = isSecure ? "; Secure" : "";
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    userId
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;

  document.cookie = `${TOKEN_COOKIE_NAME}=${tokens}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;
}

export function clearSharedSessionCookie(): void {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const domainStr = domain ? `; Domain=${domain}` : "";
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureStr = isSecure ? "; Secure" : "";

  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
  document.cookie = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${domainStr}${secureStr}`;
}

export function getSharedSessionCookie(): { userId: string | null; cachedTokens: number | null } {
  if (typeof document === "undefined") return { userId: null, cachedTokens: null };

  const cookies = document.cookie.split(";").reduce((acc, c) => {
    const idx = c.indexOf("=");
    if (idx > -1) {
      const key = c.slice(0, idx).trim();
      const val = c.slice(idx + 1).trim();
      if (key && val) acc[key] = safeDecodeURIComponent(val);
    }
    return acc;
  }, {} as Record<string, string>);

  const userId = cookies[SESSION_COOKIE_NAME] || null;
  const cachedTokens = cookies[TOKEN_COOKIE_NAME] ? parseInt(cookies[TOKEN_COOKIE_NAME], 10) : null;

  return { userId, cachedTokens };
}

