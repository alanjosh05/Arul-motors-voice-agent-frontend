// Thin fetch wrapper for the CRM API. The base URL is baked in at build time
// (NEXT_PUBLIC_API_URL), because the CRM is a static site.
import { clearSession, getToken } from "./session";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined | null>;

// A request that hangs (weak network, server restarting) fails after this
// instead of leaving the page loading forever; React Query then retries once.
const TIMEOUT_MS = 20_000;

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new ApiError("The server is taking too long to respond. Try again.", 0);
    }
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== "/api/auth/login") {
      clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // A full reload (not router.push) also drops cached CRM data; replace()
        // keeps the expired page out of the Back history.
        window.location.replace("/login/");
      }
    }
    const detail = data?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : null;
    throw new ApiError(message ?? `Request failed (${response.status}).`, response.status);
  }
  return data as T;
}

/** POST a multipart form (fields + files) to the API, e.g. a service report. */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  let response: Response;
  try {
    // No Content-Type: the browser sets the multipart boundary itself.
    response = await fetch(API_URL + path, {
      method: "POST",
      headers: authHeaders(),
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ApiError("Couldn't upload. Check your connection and try again.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : null;
    throw new ApiError(message ?? `Upload failed (${response.status}).`, response.status);
  }
  return data as T;
}

/** Open a file from the API (signed in) in a new tab, e.g. a service report
 * PDF. The tab opens straight away (so pop-up blockers allow it) and shows the
 * file once it has downloaded. */
export async function openFile(path: string): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const response = await fetch(API_URL + path, { headers: authHeaders(), signal: AbortSignal.timeout(120_000) });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(typeof data?.detail === "string" ? data.detail : `Couldn't open the file (${response.status}).`, response.status);
    }
    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e instanceof ApiError ? e : new ApiError("Can't reach the server. Check your connection.", 0);
  }
}

/** Download a file from the API (signed in), saving it under the server's
 * file name. Used for the Excel export and database backup. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(API_URL + path, { headers: authHeaders(), signal: AbortSignal.timeout(120_000) });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(typeof data?.detail === "string" ? data.detail : `Download failed (${response.status}).`, response.status);
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
