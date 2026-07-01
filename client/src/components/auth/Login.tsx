import { useState } from "react";
import { login } from "../../lib/authApi";
import { setAccessToken } from "../../lib/authToken";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useCurrentUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { user, token } = await login({ email, password });
      setAccessToken(token);
      setUser(user);
      navigate("/explore");
    } catch {
      setError("Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className="mx-auto flex max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
        <h1 className="text-xl font-bold text-zinc-950">Log in</h1>

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
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </>
  );
}
