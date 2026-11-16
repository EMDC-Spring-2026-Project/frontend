import axios from "axios";

function getCookie(name: string): string | null {
  const m = document.cookie.match(`(?:^|; )${name}=([^;]*)`);
  return m ? decodeURIComponent(m[1]) : null;
}

const BACKEND_ORIGIN =
  (import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "" : "https://api.emdcresults.com")).replace(/\/+$/, "");

export const API_BASE_URL = BACKEND_ORIGIN;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Auth helpers
export function login(username: string, password: string) {
  return api.post("/api/login/", { username, password });
}

export function logout() {
  return api.post("/api/logout/");
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrftoken = getCookie("csrftoken");
    if (csrftoken) {
      (config.headers as Record<string, string>)["X-CSRFToken"] = csrftoken;
    }
  }

  return config;
});

export function getAllOrganizers() {
  return api.get("/api/organizer/getAll/");
}
