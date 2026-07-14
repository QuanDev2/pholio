import { createContext, useContext } from "react";
import type { User } from "../types";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setAccessToken } from "../lib/authToken";
import { api } from "../lib/apiClient";

type CurrentUserContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

// Query key for the restored session. setQueryData against this key is how the
// login/register forms and logout push the current user into the cache.
const CURRENT_USER_KEY = ["currentUser"] as const;

// Blind-probe the httpOnly refresh cookie on load: the client can't read the
// cookie, so it asks the server. Valid cookie → fresh access token + user;
// no/expired cookie → 401, which we treat as "logged out" (resolve to null)
// rather than an error, so TanStack Query doesn't retry-storm the endpoint.
// Bare axios (not `api`) to skip the refresh interceptor and avoid a second
// refresh call firing on the 401.
async function restoreSession(): Promise<User | null> {
  try {
    const res = await axios.post(
      "http://localhost:4000/api/v1/auth/refresh",
      {},
      { withCredentials: true },
    );
    setAccessToken(res.data.token);
    const userRes = await api.get("/auth/me");
    return userRes.data.data as User;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // TanStack Query dedupes concurrent fetches of the same key, so React
  // StrictMode's double effect fires exactly one /auth/refresh — no duplicate
  // rotation race. staleTime: Infinity + no refetch keeps the session under our
  // explicit control (setQueryData below), never auto-refetched.
  const { data: user = null, isLoading } = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: restoreSession,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  function setUser(next: User | null) {
    queryClient.setQueryData(CURRENT_USER_KEY, next);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // even if the server call fails, clear local session below
    }
    setAccessToken(null);
    setUser(null);
  }

  return (
    <CurrentUserContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + hook colocated; revisited in Week 4 useAuth refactor
export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside CurrentUserProvider");

  return ctx;
}
