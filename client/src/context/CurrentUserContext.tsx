import { createContext, useContext, useState } from "react";
import type { User } from "../types";

type CurrentUserContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

const MOCK_USER: User = {
  id: "user-1",
  username: "quan",
  name: "quan",
  email: "contact@pholio.dev",
};

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <CurrentUserContext.Provider value={{ user, setUser }}>{children}</CurrentUserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + hook colocated; revisited in Week 4 useAuth refactor
export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside CurrentUserProvider");

  return ctx;
}
