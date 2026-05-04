const base = () => (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("token");
}

export function setSession(token, user) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
  if (user) localStorage.setItem("user", JSON.stringify(user));
  else localStorage.removeItem("user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${base()}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || "Request failed");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/auth/me"),
  members: () => request("/api/auth/members"),
  projects: () => request("/api/projects"),
  createProject: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  addProjectMember: (projectId, userId) =>
    request(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  tasks: () => request("/api/tasks"),
  createTask: (body) => request("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  assignTask: (id, assignedTo) =>
    request(`/api/tasks/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo }),
    }),
  updateTaskStatus: (id, status) =>
    request(`/api/tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  stats: () => request("/api/stats"),
  activity: (days) => request(`/api/activity?days=${days || 84}`),
};
