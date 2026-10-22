import type { SupportedStorage } from "@supabase/supabase-js";

export function getCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname;
  if (hostname.endsWith("bikinkilat.web.id")) {
    return ".bikinkilat.web.id";
  }
  return undefined;
}

export const crossSubdomainStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const idx = c.indexOf("=");
      if (idx > -1) {
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        acc[k] = decodeURIComponent(v);
      }
      return acc;
    }, {} as Record<string, string>);

    if (cookies[key]) return cookies[key];

    // Check chunked cookies
    if (cookies[`${key}.0`]) {
      let full = "";
      let i = 0;
      while (cookies[`${key}.${i}`]) {
        full += cookies[`${key}.${i}`];
        i++;
      }
      return full;
    }

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
      document.cookie = `${key}=${encoded}; Path=/${domainStr}; Max-Age=${maxAge}; SameSite=Lax${secureStr}`;
      document.cookie = `${key}.0=; Path=/${domainStr}; Max-Age=0; SameSite=Lax${secureStr}`;
      document.cookie = `${key}.1=; Path=/${domainStr}; Max-Age=0; SameSite=Lax${secureStr}`;
    } else {
      document.cookie = `${key}=; Path=/${domainStr}; Max-Age=0; SameSite=Lax${secureStr}`;
      let offset = 0;
      let i = 0;
      while (offset < encoded.length) {
        const chunk = encoded.slice(offset, offset + CHUNK_SIZE);
        document.cookie = `${key}.${i}=${chunk}; Path=/${domainStr}; Max-Age=${maxAge}; SameSite=Lax${secureStr}`;
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

    document.cookie = `${key}=; Path=/${domainStr}; Max-Age=0; SameSite=Lax${secureStr}`;
    for (let i = 0; i < 5; i++) {
      document.cookie = `${key}.${i}=; Path=/${domainStr}; Max-Age=0; SameSite=Lax${secureStr}`;
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
  },
};
