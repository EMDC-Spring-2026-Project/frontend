import type { AxiosError } from "axios";

export const SESSION_EXPIRED_REASON = "session-expired";
export const SESSION_EXPIRED_LOGIN_PATH = `/login/?reason=${SESSION_EXPIRED_REASON}`;

// Login/logout answer 401/403 for reasons other than an expired session
// (e.g. a wrong password), so they never trigger the redirect.
const AUTH_ENDPOINTS = ["/api/login/", "/api/logout/"];

// DRF raises NotAuthenticated with this detail when a request has no valid
// session. With SessionAuthentication it is sent as 403, not 401.
const NOT_AUTHENTICATED_PATTERN =
  /authentication credentials were not provided|not authenticated/i;

/**
 * True when a failed request means the user's login session is gone.
 *
 * - 401 from any non-auth endpoint.
 * - 403 only when DRF says the request was unauthenticated. A 403 for a
 *   logged-in user who lacks permission ("You do not have permission...")
 *   must not log them out.
 */
export function isSessionExpiredError(error: AxiosError): boolean {
  const response = error.response;
  if (!response) return false;

  const url = error.config?.url ?? "";
  if (AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))) return false;

  if (response.status === 401) return true;
  if (response.status !== 403) return false;

  const data = response.data as { detail?: unknown; code?: unknown } | undefined;
  if (data?.code === "not_authenticated") return true;
  return typeof data?.detail === "string" && NOT_AUTHENTICATED_PATTERN.test(data.detail);
}
