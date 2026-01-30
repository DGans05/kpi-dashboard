// Simple typed API client for talking to the backend
// Uses cookie-based auth (credentials: 'include')

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Please configure it in your environment.',
    );
  }

  return baseUrl.replace(/\/+$/, ''); // remove trailing slashes
}

function buildUrl(endpoint: string): string {
  // Allow absolute URLs to pass through
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const baseUrl = getBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return `${baseUrl}${path}`;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildUrl(endpoint);

  const fetchOptions: RequestInit = {
    // Ensure we send cookies for auth (REQUIRED for cross-origin cookie handling)
    credentials: 'include',
    // Default headers, allowing caller to override/extend
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${fetchOptions.method || 'GET'} ${url}`);
  }

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    // Network error (CORS blocked, server down, etc.)
    console.error(`[API] Network error fetching ${url}:`, networkError);
    throw new Error(
      `Failed to connect to API at ${url}. ` +
      `Check that the backend is running and CORS is configured correctly.`
    );
  }

  // Try to parse JSON body (even on error responses)
  let data: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const messageFromBody =
      (typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as any).message === 'string' &&
        (data as any).message) ||
      response.statusText ||
      'Request failed';

    throw new ApiError(messageFromBody, response.status, data);
  }

  // For 204 No Content or empty body, return undefined as T
  if (response.status === 204 || data === null || data === '') {
    return undefined as T;
  }

  return data as T;
}

// Optional convenience helpers
export function getRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

export function postRequest<T = unknown, B = unknown>(
  endpoint: string,
  body?: B,
  options: RequestInit = {},
): Promise<T> {
  const serializedBody =
    body !== undefined ? JSON.stringify(body) : options.body ?? undefined;

  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: serializedBody,
  });
}

