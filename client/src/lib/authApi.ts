import { api } from "./apiClient";
import type { User } from "../types";

type AuthResponse = { data: User; token: string };

export async function login({ email, password }: { email: string; password: string }) {
  const res = await api.post<AuthResponse>("/auth/login", { email, password });

  return { user: res.data.data, token: res.data.token };
}

export async function register({
  email,
  username,
  name,
  password,
}: {
  email: string;
  username: string;
  name: string;
  password: string;
}) {
  const res = await api.post<AuthResponse>("/auth/register", {
    email,
    username,
    name,
    password,
  });

  return { user: res.data.data, token: res.data.token };
}
