import type { Tier } from "../../workers/shared/constants";

export class UpgradeRequiredError extends Error {
  constructor(
    public currentTier: Tier,
    public requiredTier: Tier,
  ) {
    super(`Requires ${requiredTier} subscription`);
    this.name = "UpgradeRequiredError";
  }
}

class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

let apiBaseUrl = "";
let apiToken: string | null = null;

export function setApiBaseUrl(url: string) {
  apiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  if (apiBaseUrl) return apiBaseUrl;
  const url = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
  return url.replace(/\/v1\/?$/, '');
}

export function setApiToken(token: string | null) {
  apiToken = token;
}

export function getApiToken(): string | null {
  return apiToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (!headers["Content-Type"] && !(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (apiToken) {
    headers["Authorization"] = `Bearer ${apiToken}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    const isAuthRoute = path.startsWith("/v1/auth/");
    if (!isAuthRoute && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new UnauthorizedError();
  }

  if (response.status === 403) {
    const body = await response.json().catch(() => ({}));
    if (body.upgrade_required) {
      throw new UpgradeRequiredError(body.current_tier, body.required_tier);
    }
    throw new ApiError(403, body.error ?? "Forbidden");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error ?? `HTTP ${response.status}`, body.details);
  }

  return response.json() as Promise<T>;
}
