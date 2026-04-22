import axios from "axios";

function getCookie(name: string): string | null {
  const m = document.cookie.match(`(?:^|; )${name}=([^;]*)`);
  return m ? decodeURIComponent(m[1]) : null;
}

const BACKEND_ORIGIN =
  (import.meta as any).env?.VITE_BACKEND_URL || "https://api.emdcresults.com";

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
  return api.get("/organizer/getAll/");
}

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - session expired or not authenticated
    if (error?.response?.status === 401) {
      const errorMessage =
        error?.response?.data?.detail || "Authentication credentials were not provided";
      console.error("Authentication error:", errorMessage);

      if (
        errorMessage.includes("Authentication credentials") ||
        errorMessage.includes("not authenticated")
      ) {
        if (window.location.pathname !== "/login/") {
          console.warn("Session expired. Please log in again.");
          // window.location.href = "/login/"
        }
      }
    }

    return Promise.reject(error);
  }
);
