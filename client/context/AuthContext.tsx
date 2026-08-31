import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { apiUrl } from "@/lib/api-config";
import {
  buildSession,
  saveSession,
  loadSession,
  clearSession,
  evaluateSession,
  touchSession,
  type StoredSession,
  type SessionValidity,
} from "@/lib/offline/sessionStore";
import { clearAllOfflineCaches } from "@/lib/offline/memberCache";
import { hasPendingSyncItems } from "@/lib/offline/syncEngine";
import { onAuthExpired } from "@/lib/offline/authEvents";

export interface User {
  id: string;
  generated_id: string;
  first_name: string;
  last_name: string;
  user_phone: string;
  gender: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True once we've determined the local 20-day session has expired (vs simply absent). */
  sessionExpired: boolean;
  session: StoredSession | null;
  sessionValidity: SessionValidity;
  login: (firstName: string, lastName: string, generatedId: string, password: string) => Promise<void>;
  logout: () => Promise<{ hadPendingSync: boolean }>;
  setAuthUser: (user: User) => void;
  /** Call when the server responds 401 to a live API call while a local session exists: the JWT truly expired. */
  handleAuthExpiredFromServer: () => void;
  /** Push the 20-day expiry back out from now. Call on meaningful navigation/actions. */
  renewSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore session on mount. This never touches the network: a valid
  // local session is honored purely based on the stored expiry date.
  useEffect(() => {
    const stored = loadSession();
    const validity = evaluateSession(stored);

    if (validity.status === "valid") {
      // Reopening the app counts as an action: push the 20-day window
      // back out from now, rather than from whenever the member last
      // happened to log in.
      touchSession();
      setSession(loadSession());
    } else if (validity.status === "expired") {
      clearSession();
      setSession(null);
      setSessionExpired(true);
    } else {
      setSession(null);
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (firstName: string, lastName: string, generatedId: string, password: string) => {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, generated_id: generatedId, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Login failed");
      }

      const userData = (await response.json()) as User;
      const newSession = buildSession(userData);
      saveSession(newSession);
      setSession(newSession);
      setSessionExpired(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    const hadPendingSync = await hasPendingSyncItems();
    clearSession();
    await clearAllOfflineCaches();
    setSession(null);
    setSessionExpired(false);
    return { hadPendingSync };
  }, []);

  const setAuthUser = useCallback((userData: User) => {
    const newSession = buildSession(userData);
    saveSession(newSession);
    setSession(newSession);
    setSessionExpired(false);
  }, []);

  // Called by the API layer when a request comes back 401 while we believed
  // we had a valid session: this means the JWT itself expired server-side
  // (distinct from "no internet", which never triggers this).
  const handleAuthExpiredFromServer = useCallback(() => {
    clearSession();
    setSession(null);
    setSessionExpired(true);
  }, []);

  // A confirmed 401 from the server (not a network failure) means the JWT
  // truly expired even though our local 20-day session clock hadn't run out
  // yet (e.g. server-side revocation). Surface it the same way as a natural
  // expiry, but never in response to a mere connectivity drop.
  useEffect(() => onAuthExpired(handleAuthExpiredFromServer), [handleAuthExpiredFromServer]);

  const sessionValidity = useMemo(() => evaluateSession(session), [session]);

  const renewSession = useCallback(() => {
    if (!session) return;
    touchSession();
    setSession(loadSession());
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading,
        sessionExpired,
        session,
        sessionValidity,
        login,
        logout,
        setAuthUser,
        handleAuthExpiredFromServer,
        renewSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
