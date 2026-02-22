const getBaseUrl = () => localStorage.getItem("kp_registry_url") || "";
const getApiKey = () => localStorage.getItem("kp_api_key") || "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getApiKey() && { Authorization: `Bearer ${getApiKey()}` }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((error as { error: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // SOP endpoints
  searchSOPs: (params?: Record<string, string>) =>
    request(`/v1/sop?${new URLSearchParams(params || {})}`),
  getSOP: (id: string) => request(`/v1/sop/${id}`),
  createSOP: (data: unknown) => request("/v1/sop", { method: "POST", body: JSON.stringify(data) }),
  updateSOP: (id: string, data: unknown) => request(`/v1/sop/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSOP: (id: string) => request(`/v1/sop/${id}`, { method: "DELETE" }),
  approveSOP: (id: string) => request(`/v1/sop/${id}/approve`, { method: "POST" }),
  exportSkill: (id: string) => request(`/v1/sop/${id}/export-skill`, { method: "POST" }),
  getVersions: (id: string) => request(`/v1/sop/${id}/versions`),

  // Marketplace
  getBalance: () => request("/v1/marketplace/balance"),
  getListings: (params?: Record<string, string>) =>
    request(`/v1/marketplace/listings?${new URLSearchParams(params || {})}`),
};
