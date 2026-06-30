import axios from "axios";
import type { User } from "../types";

export async function login({ email, password }: { email: string; password: string }) {
  const res = await axios.post<{ data: User; token: string }>(
    "http://localhost:4000/api/v1/auth/login",
    { email, password },
    {
      withCredentials: true,
    },
  );

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
  const res = await axios.post<{ data: User; token: string }>(
    "http://localhost:4000/api/v1/auth/register",
    { email, username, name, password },
    {
      withCredentials: true,
    },
  );

  return { user: res.data.data, token: res.data.token };
}
