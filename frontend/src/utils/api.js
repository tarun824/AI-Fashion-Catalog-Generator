const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

const API_PREFIX = "/api/ai-fashion-generator";

class ApiClient {
  constructor(baseUrl, tokenKey = "authToken") {
    this.baseUrl = baseUrl;
    this.tokenKey = tokenKey;
  }

  getAuthToken() {
    return localStorage.getItem(this.tokenKey);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${API_PREFIX}${endpoint}`;
    const token = this.getAuthToken();

    const headers = {
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const config = {
      ...options,
      headers,
    };

    if (config.body && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response;
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body: data });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body: data });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body: data });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  getImageUrl(gridFsId) {
    if (!gridFsId) return null;
    return `${this.baseUrl}${API_PREFIX}/api/images/${gridFsId}`;
  }
}

export const api = new ApiClient(API_BASE_URL, "authToken");
export const vendorApi = new ApiClient(API_BASE_URL, "vendorAuthToken");
export { API_BASE_URL, API_PREFIX };
