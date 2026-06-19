import * as SecureStore from "expo-secure-store";

// Default: tunel Tailscale Funnel — URL publica FIJA (no rota), accesible desde
// cualquier red. Configurable con EXPO_PUBLIC_API_URL (.env.local para dev,
// eas.json para los builds). Requiere la PC encendida con Tailscale + backend :8080.
const DEFAULT_API_BASE = "https://ivan.tailc7ed08.ts.net";
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE;
const API_PATH = `${API_BASE}/api/v1`;

const TOKEN_KEY = "vitae_token";
const USER_ID_KEY = "vitae_user_id";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function setCredentials(token: string, userId: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_ID_KEY, userId);
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ID_KEY);
}

const ERROR_TRANSLATIONS: Record<string, string> = {
  "day is closed": "El dia esta cerrado",
  "invalid credentials": "Credenciales invalidas",
};

function translateError(msg: string): string {
  return ERROR_TRANSLATIONS[msg.toLowerCase()] ?? msg;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_PATH}${path}`, {
    ...options,
    headers,
  });

  // Las rutas /auth/ (login, register, google) manejan su propio 401:
  // no limpiamos credenciales ni reseteamos sesion, dejamos pasar a la
  // traduccion de errores de abajo (ej: "Credenciales invalidas").
  if (response.status === 401 && !path.startsWith("/auth/")) {
    await clearCredentials();
    onUnauthorized?.();
    throw new ApiError(401, "No autorizado");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error ?? text;
    } catch {
      // Cuerpo no-JSON (ej: 404 text/plain, error de proxy): usamos el texto crudo.
    }
    throw new ApiError(response.status, translateError(message) || `Error ${response.status}`);
  }

  return response.json();
}

export async function userFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = await getUserId();
  if (!userId) {
    await clearCredentials();
    onUnauthorized?.();
    throw new ApiError(401, "No autorizado");
  }
  return apiFetch<T>(`/users/${userId}${path}`, options);
}
