const defaultApiUrl = () => {
  if (window.location.port === "5173") {
    return "http://127.0.0.1:8080";
  }
  return window.location.origin;
};

const configuredApiUrl = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env
  ?.VITE_API_URL;

export const API_URL = configuredApiUrl || defaultApiUrl();

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiFailure extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  token?: string | null,
  options: ApiOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiFailure(payload?.message ?? "Erreur réseau.", response.status);
  }

  return response.json() as Promise<T>;
}

export function websocketUrl(token: string): string {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}
