import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";
import axios from "axios";
import { setAccessToken } from "../lib/authToken";
import { api } from "../lib/apiClient";

type CurrentUserContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreUser() {
      try {
        const res = await api.post("auth/refresh", {}, { withCredentials: true });
        setAccessToken(res.data.token);
        const userRes = await api.get("/auth/me");
        setUser(userRes.data.data);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreUser();
  }, []);

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
