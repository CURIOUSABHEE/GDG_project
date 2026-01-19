// For local development, use: 'http://localhost:5001/api'
// For production, use: 'https://gdg-project-yexd.onrender.com/api'
const API_BASE = "http://localhost:5001/api";

export const api = {
  get: async (endpoint) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return handleResponse(res);
  },
  post: async (endpoint, data) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  put: async (endpoint, data) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (endpoint) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return handleResponse(res);
  },
};

async function getToken() {
  const result = await chrome.storage.local.get(["token"]);
  return result.token;
}

async function handleResponse(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}
