import { useState } from "react";
import { register } from "../../lib/authApi";
import { setAccessToken } from "../../lib/authToken";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
  // form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  // flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useCurrentUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { user, token } = await register({ email, username, name, password });
      setAccessToken(token);
      setUser(user);
      navigate("/explore");
    } catch (err) {
      const fallback = "Signing up failed";
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? fallback) : fallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className="mx-auto flex max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
        <h1 className="text-xl font-bold text-zinc-950">Sign up</h1>

        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          {isSubmitting ? "Signing up..." : "Sign up"}
        </button>
      </form>
    </>
  );
}
