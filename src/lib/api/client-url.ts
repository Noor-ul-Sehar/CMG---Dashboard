const normalizeBase = (value: string | undefined): string => {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "");
};

export function apiUrl(path: string): string {
  const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!base) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseEndsWithApi = base.endsWith("/api");
  const pathStartsWithApi = normalizedPath.startsWith("/api/");

  if (baseEndsWithApi && pathStartsWithApi) {
    return `${base}${normalizedPath.slice("/api".length)}`;
  }

  return `${base}${normalizedPath}`;
}
