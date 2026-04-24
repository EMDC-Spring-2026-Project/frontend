import axios, { AxiosHeaders } from "axios";
import { api, API_BASE_URL } from "./api";
import type { InternalAxiosRequestConfig } from "axios";

function getCookie(name: string): string | null {
  const match = document.cookie.match(`(?:^|; )${name}=([^;]*)`);
  return match ? decodeURIComponent(match[1]) : null;
}

axios.defaults.withCredentials = true;

// CSRF endpoint: /api/auth/csrf/
const CSRF_URL = `${API_BASE_URL}/api/auth/csrf/`;

// Prime the CSRF cookie once in the browser so subsequent POSTs succeed
// Use requestIdleCallback for non-blocking initialization
if (typeof window !== "undefined") {
  const fetchCSRF = () => {
    fetch(CSRF_URL, { credentials: "include" }).catch(() => {
      // ignore — login/signup will retry automatically if needed
    });
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(fetchCSRF, { timeout: 2000 });
  } else {
    setTimeout(fetchCSRF, 0);
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Remove any stale Authorization header; rely on session cookie instead
  if (!config.headers) config.headers = new AxiosHeaders();
  const headers = config.headers as AxiosHeaders;
  if (headers.has("Authorization")) headers.delete("Authorization");
  const method = (config.method || "get").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCookie("csrftoken");
    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    } else {
      console.warn("No CSRF token found in cookie");
    }
  }
  return config;
});

