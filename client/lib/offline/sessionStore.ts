/**
 * Persistent local session — 20 days from the member's LAST action, not
 * from login. Every meaningful action in the app should call
 * touchSession() to push the expiry back out, so an actively-used app
 * effectively never logs someone out, while a genuinely abandoned
 * install still expires 20 days after the last time it was actually
 * used.
 */
import type { User } from "@/context/AuthContext";

export const SESSION_DURATION_DAYS = 20;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
const SESSION_KEY = "shm_member_session_v1";

// Warn the member their session is about to expire inside this window.
export const SESSION_EXPIRY_WARNING_DAYS = 3;

export interface StoredSession {
  user: User;
  loginAt: string; // ISO timestamp of the last successful authentication
  expiresAt: string; // ISO timestamp, loginAt + 20 days
}

export function buildSession(user: User): StoredSession {
  const loginAt = new Date();
  const expiresAt = new Date(loginAt.getTime() + SESSION_DURATION_MS);
  return { user, loginAt: loginAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Kept for backward compatibility with any existing code paths that
    // still read the older flat "authToken" key directly.
    if (session.user.token) localStorage.setItem("authToken", session.user.token);
    localStorage.setItem("user_generated_id", session.user.generated_id);
  } catch (error) {
    console.error("[offline/session] Failed to persist session:", error);
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.user || !parsed?.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  localStorage.removeItem("user_generated_id");
}

/**
 * Pushes the session's expiry 20 days out from right now, keeping the
 * same user payload. Call this on meaningful member actions (navigation,
 * API calls, opening the app) so an actively-used session never actually
 * hits its expiry — only real inactivity does.
 */
export function touchSession(): void {
  const current = loadSession();
  if (!current) return;
  const renewed = buildSession(current.user);
  saveSession(renewed);
}

export type SessionValidity =
  | { status: "valid"; expiresAt: Date; daysRemaining: number; expiringSoon: boolean }
  | { status: "expired"; expiresAt: Date }
  | { status: "none" };

export function evaluateSession(session: StoredSession | null): SessionValidity {
  if (!session) return { status: "none" };
  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return { status: "expired", expiresAt };
  }
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return {
    status: "valid",
    expiresAt,
    daysRemaining,
    expiringSoon: daysRemaining <= SESSION_EXPIRY_WARNING_DAYS,
  };
}
