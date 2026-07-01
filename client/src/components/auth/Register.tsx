import { useState } from "react";
import { register } from "../../lib/authApi";
import { setAccessToken } from "../../lib/authToken";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { validateRegister, type RegisterFieldErrors } from "../../lib/authValidation";

export default function Register() {
  // form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  // flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const { setUser } = useCurrentUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");

    const errors = validateRegister({ email, username, name, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return; // block the request when invalid

    setIsSubmitting(true);
    try {
      const { user, token } = await register({ email, username, name, password });
      setAccessToken(token);
      setUser(user);
      navigate("/explore");
    } catch (err) {
      const fallback = "Signing up failed";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const message =
          data?.details?.[0]?.message ?? // first field-level validation message
          data?.error ?? // top-level message (409, etc.)
          fallback;
        setError(message);
      } else {
        setError(fallback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className="mx-auto flex max-w-sm flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <h1 className="text-xl font-bold text-zinc-950">Sign up</h1>

        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {fieldErrors.name && <span className="text-xs text-red-600">{fieldErrors.name}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {fieldErrors.username && (
            <span className="text-xs text-red-600">{fieldErrors.username}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {fieldErrors.email && <span className="text-xs text-red-600">{fieldErrors.email}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {fieldErrors.password && (
            <span className="text-xs text-red-600">{fieldErrors.password}</span>
          )}
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
