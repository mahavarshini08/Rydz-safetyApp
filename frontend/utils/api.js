import { auth } from "../firebase";
import { API_URL } from "../config";

export async function apiRequest(endpoint, method = "GET", body = null) {
  // Always get a fresh token
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API request failed");
  return data;
}
