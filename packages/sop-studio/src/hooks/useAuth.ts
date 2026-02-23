export function useAuth() {
  const apiKey = localStorage.getItem("kp_api_key") || "";
  const registryUrl = localStorage.getItem("kp_registry_url") || "";
  const isAuthenticated = apiKey.length > 0 && registryUrl.length > 0;
  return { isAuthenticated, apiKey, registryUrl };
}
