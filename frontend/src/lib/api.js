const BASE = ""; // relative to same domain in prod

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: opts.body instanceof FormData ? {} : { "Content-Type": "application/json", ...opts.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 200));
  }
  return res.json();
}

export function fetchStats() {
  return api("/api/stats");
}

export function fetchRules() {
  return api("/api/rules");
}

export function createRule(name, keywords, reply_template, description) {
  const fd = new FormData();
  fd.append("name", name);
  fd.append("keywords", keywords);
  fd.append("reply_template", reply_template);
  fd.append("description", description || "");
  return api("/api/rules", { method: "POST", body: fd });
}

export function updateRule(id, name, keywords, reply_template, description) {
  const fd = new FormData();
  fd.append("name", name);
  fd.append("keywords", keywords);
  fd.append("reply_template", reply_template);
  fd.append("description", description || "");
  return api(`/api/rules/${id}`, { method: "PUT", body: fd });
}

export function deleteRule(id) {
  return api(`/api/rules/${id}`, { method: "DELETE" });
}

export function toggleRule(id) {
  return api(`/api/rules/${id}/toggle`, { method: "POST" });
}

export function fetchReplies(page = 1, perPage = 20) {
  return api(`/api/replies?page=${page}&per_page=${perPage}`);
}

export function fetchPosts() {
  return api("/api/posts");
}

export function publishPost(message) {
  const fd = new FormData();
  fd.append("message", message);
  return api("/api/publish", { method: "POST", body: fd });
}

export function fetchBotStatus() {
  return api("/api/bot/status");
}

export function restartBot() {
  return api("/api/bot/restart", { method: "POST" });
}

export function fetchLogs(limit = 50) {
  return api(`/api/logs?limit=${limit}`);
}
