// apps/web/src/lib/api.ts
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }
  return base.replace(/\/+$/, "");
}

type ApiFetchOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  token?: string;          // <-- fix: token toegestaan
  auth?: boolean;          // <-- optioneel: als true -> token uit localStorage
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  let token = options.token;

  if (!token && options.auth) {
    // Let op: alleen beschikbaar in browser
    if (typeof window !== "undefined") {
      token = localStorage.getItem("wms_token") ?? undefined;
    }
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!res.ok) {
    let details: unknown = undefined;
    let message = res.statusText || "Request failed";

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        details = await res.json();
        if (details && typeof details === "object" && "message" in (details as any)) {
          const m = (details as any).message;
          if (typeof m === "string") message = m;
        }
      } catch {
        // ignore
      }
    } else {
      try {
        message = await res.text();
      } catch {
        // ignore
      }
    }

    throw new ApiError(res.status, message, details);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

  // fallback: text -> any
  return (await res.text()) as unknown as T;
}