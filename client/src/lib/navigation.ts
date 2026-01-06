export function normalizeAppPath(target?: string | null): string | null {
  if (!target) return null;

  if (target.startsWith("/")) {
    return target;
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    try {
      const url = new URL(target);
      if (url.origin === window.location.origin) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return null;
    }
  }

  return null;
}
